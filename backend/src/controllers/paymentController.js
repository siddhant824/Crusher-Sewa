import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import {
  applyVerificationResultToPayment,
  buildEsewaCallbackUrls,
  buildEsewaFormPayload,
  decodeEsewaResponseData,
  generateEsewaTransactionUuid,
  getEsewaConfig,
  getFrontendBaseUrl,
  getOrderPaymentSnapshot,
  syncOrderPaymentStatus,
  verifyEsewaSignature,
  verifyEsewaTransactionStatus,
} from "../services/paymentService.js";

const paymentPopulate = [
  {
    path: "order",
    select: "contractor totalAmount paymentStatus orderStatus deliveryStatus createdAt",
  },
  {
    path: "contractor",
    select: "name email",
  },
];

const parseAmount = (value) => Number(Number(value).toFixed(2));

const canAccessOrder = (order, user) =>
  user.role !== "CONTRACTOR" || String(order.contractor?._id || order.contractor) === String(user._id);

const findPaymentForUser = async (paymentId, user) => {
  const payment = await Payment.findById(paymentId).populate(paymentPopulate);

  if (!payment) {
    return { error: { status: 404, message: "Payment not found" } };
  }

  if (!canAccessOrder(payment.order, user)) {
    return { error: { status: 403, message: "You can only access payments for your own orders" } };
  }

  return { payment };
};

const resolveCallbackPayload = (req) => {
  const encodedData = req.query.data || req.body?.data;

  if (encodedData) {
    return decodeEsewaResponseData(encodedData);
  }

  if (req.body && Object.keys(req.body).length > 0) {
    return req.body;
  }

  return null;
};

const sendCallbackResponse = (req, res, payment, order) => {
  const frontendBaseUrl = getFrontendBaseUrl();

  if (frontendBaseUrl) {
    const redirectUrl = new URL("/payment-return", frontendBaseUrl);
    redirectUrl.searchParams.set("paymentId", String(payment._id));
    redirectUrl.searchParams.set("orderId", String(order._id));
    redirectUrl.searchParams.set("paymentStatus", payment.status);
    res.redirect(redirectUrl.toString());
    return;
  }

  res.json({
    message: "eSewa callback processed",
    payment,
    order,
  });
};

const applyFallbackOutcomeStatus = async (payment, outcome) => {
  const normalizedOutcome = String(outcome || "").trim().toLowerCase();

  if (payment.status !== "INITIATED") {
    return false;
  }

  if (normalizedOutcome === "success") {
    payment.status = "PENDING";
    payment.note = payment.note || "Returned from eSewa without a final verification status.";
  } else if (normalizedOutcome === "failure") {
    payment.status = "FAILED";
    payment.note = payment.note || "eSewa returned to the failure URL before payment completed.";
  } else {
    return false;
  }

  await payment.save();
  return true;
};

export const initiateEsewaPayment = async (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrder(order, req.user)) {
      return res.status(403).json({ message: "You can only pay for your own orders" });
    }

    if (order.orderStatus !== "APPROVED") {
      return res.status(400).json({
        message: "Only approved orders can be paid through eSewa",
      });
    }

    const { outstandingAmount } = await getOrderPaymentSnapshot(order._id);
    if (outstandingAmount <= 0) {
      return res.status(400).json({ message: "This order is already fully paid" });
    }

    const requestedAmount =
      amount === undefined || amount === null || amount === ""
        ? outstandingAmount
        : parseAmount(amount);

    if (Number.isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ message: "amount must be a valid positive number" });
    }

    if (requestedAmount > outstandingAmount + 0.001) {
      return res.status(400).json({
        message: `Requested amount exceeds remaining payable amount of Rs. ${outstandingAmount.toFixed(2)}`,
      });
    }

    const config = getEsewaConfig();
    const payment = new Payment({
      order: order._id,
      contractor: order.contractor,
      provider: "ESEWA",
      productCode: config.productCode,
      amount: requestedAmount,
      status: "INITIATED",
    });

    payment.transactionUuid = generateEsewaTransactionUuid(payment._id);

    const { successUrl, failureUrl } = buildEsewaCallbackUrls(payment._id);
    const formFields = buildEsewaFormPayload({
      amount: requestedAmount,
      transactionUuid: payment.transactionUuid,
      successUrl,
      failureUrl,
    });

    payment.successUrl = successUrl;
    payment.failureUrl = failureUrl;
    payment.rawInitiationPayload = formFields;
    await payment.save();

    const populatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);

    return res.status(201).json({
      message: "eSewa payment initiated successfully",
      payment: populatedPayment,
      esewa: {
        provider: "ESEWA",
        env: config.env,
        formUrl: config.formUrl,
        method: "POST",
        fields: formFields,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to initiate eSewa payment",
    });
  }
};

export const verifyPayment = async (req, res) => {
  const { id } = req.params;

  try {
    const lookup = await findPaymentForUser(id, req.user);
    if (lookup.error) {
      return res.status(lookup.error.status).json({ message: lookup.error.message });
    }

    const { payment } = lookup;
    const verificationResponse = await verifyEsewaTransactionStatus({
      transactionUuid: payment.transactionUuid,
      totalAmount: payment.amount,
      productCode: payment.productCode,
    });

    const result = await applyVerificationResultToPayment({
      payment,
      verificationResponse,
    });

    const populatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);

    return res.json({
      message: "Payment verified successfully",
      payment: populatedPayment,
      order: result.order,
    });
  } catch (err) {
    return res.status(502).json({
      message: err.message || "Failed to verify payment with eSewa",
    });
  }
};

export const handleEsewaCallback = async (req, res) => {
  const paymentId = req.query.paymentId || req.body?.paymentId;
  const callbackPayload = resolveCallbackPayload(req);
  const callbackOutcome = req.query.outcome || req.body?.outcome;

  try {
    let payment = null;

    if (paymentId) {
      payment = await Payment.findById(paymentId).populate(paymentPopulate);
    }

    if (!payment && callbackPayload?.transaction_uuid) {
      payment = await Payment.findOne({ transactionUuid: callbackPayload.transaction_uuid }).populate(
        paymentPopulate
      );
    }

    if (!payment) {
      return res.status(404).json({ message: "Payment not found for callback" });
    }

    const callbackSignatureValid =
      callbackPayload && callbackPayload.signature && callbackPayload.signed_field_names
        ? verifyEsewaSignature(callbackPayload)
        : null;

    let verificationResponse = null;
    try {
      verificationResponse = await verifyEsewaTransactionStatus({
        transactionUuid: payment.transactionUuid,
        totalAmount: payment.amount,
        productCode: payment.productCode,
      });
    } catch (verificationErr) {
      payment.note = verificationErr.message || payment.note;
    }

    const result = await applyVerificationResultToPayment({
      payment,
      callbackPayload,
      callbackSignatureValid,
      verificationResponse,
    });

    const appliedFallbackOutcome = await applyFallbackOutcomeStatus(payment, callbackOutcome);
    if (appliedFallbackOutcome) {
      const syncResult = await syncOrderPaymentStatus(payment.order);
      result.order = syncResult.order;
    }

    const populatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);
    return sendCallbackResponse(req, res, populatedPayment, result.order);
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to process eSewa callback",
    });
  }
};

export const getPaymentsForOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrder(order, req.user)) {
      return res.status(403).json({ message: "You can only view payments for your own orders" });
    }

    const payments = await Payment.find({ order: orderId })
      .populate(paymentPopulate)
      .sort({ createdAt: -1 });

    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch payments for this order",
    });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ contractor: req.user._id })
      .populate(paymentPopulate)
      .sort({ createdAt: -1 });

    return res.json({ payments });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch your payments",
    });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const { status = "", provider = "", search = "" } = req.query;
    const query = {};

    if (status.trim()) {
      query.status = status.trim().toUpperCase();
    }

    if (provider.trim()) {
      query.provider = provider.trim().toUpperCase();
    }

    const payments = await Payment.find(query)
      .populate(paymentPopulate)
      .sort({ createdAt: -1 });

    const normalizedSearch = search.trim().toLowerCase();
    const filteredPayments = normalizedSearch
      ? payments.filter((payment) => {
          const contractorName = payment.contractor?.name?.toLowerCase() || "";
          const contractorEmail = payment.contractor?.email?.toLowerCase() || "";
          const transactionUuid = String(payment.transactionUuid || "").toLowerCase();
          const providerTransactionId = String(payment.providerTransactionId || "").toLowerCase();

          return (
            contractorName.includes(normalizedSearch) ||
            contractorEmail.includes(normalizedSearch) ||
            transactionUuid.includes(normalizedSearch) ||
            providerTransactionId.includes(normalizedSearch)
          );
        })
      : payments;

    return res.json({ payments: filteredPayments });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch payments",
    });
  }
};

export const getPaymentSummary = async (_req, res) => {
  try {
    const payments = await Payment.find();
    const totalCollected = payments
      .filter((payment) => payment.status === "COMPLETE" || payment.status === "PARTIAL_REFUND")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    return res.json({
      summary: {
        totalTransactions: payments.length,
        totalCollected: parseAmount(totalCollected || 0),
        completePayments: payments.filter((payment) => payment.status === "COMPLETE").length,
        pendingPayments: payments.filter((payment) => payment.status === "PENDING").length,
        failedPayments: payments.filter((payment) => payment.status === "FAILED").length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch payment summary",
    });
  }
};

export const recordManualPayment = async (req, res) => {
  const { orderId, amount, note = "", referenceId = "" } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const snapshot = await getOrderPaymentSnapshot(orderId);
    const requestedAmount = parseAmount(amount);

    if (Number.isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ message: "amount must be a valid positive number" });
    }

    if (requestedAmount > snapshot.outstandingAmount + 0.001) {
      return res.status(400).json({
        message: `Amount exceeds remaining payable amount of Rs. ${snapshot.outstandingAmount.toFixed(2)}`,
      });
    }

    const payment = await Payment.create({
      order: order._id,
      contractor: order.contractor,
      provider: "MANUAL",
      productCode: "MANUAL",
      transactionUuid: generateEsewaTransactionUuid(new Payment()._id),
      providerTransactionId: referenceId.trim(),
      amount: requestedAmount,
      status: "COMPLETE",
      completedAt: new Date(),
      note: note.trim(),
    });

    const { order: updatedOrder } = await syncOrderPaymentStatus(order._id);
    const populatedPayment = await Payment.findById(payment._id).populate(paymentPopulate);

    return res.status(201).json({
      message: "Manual payment recorded successfully",
      payment: populatedPayment,
      order: updatedOrder,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to record manual payment",
    });
  }
};
