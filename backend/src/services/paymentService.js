import crypto from "crypto";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";

const normalizeAmount = (value) => Number(Number(value).toFixed(2));

const getRequiredEnv = (name) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
};

const getRequiredUrlEnv = (name) => {
  const value = getRequiredEnv(name);

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
};

export const getEsewaConfig = () => {
  const env = getRequiredEnv("ESEWA_ENV").toUpperCase();

  if (env !== "UAT" && env !== "PRODUCTION") {
    throw new Error('ESEWA_ENV must be either "UAT" or "PRODUCTION"');
  }

  return {
    env,
    productCode: getRequiredEnv("ESEWA_PRODUCT_CODE"),
    secretKey: getRequiredEnv("ESEWA_SECRET_KEY"),
    formUrl: getRequiredUrlEnv("ESEWA_FORM_URL"),
    statusCheckUrl: getRequiredUrlEnv("ESEWA_STATUS_CHECK_URL"),
  };
};

const getEsewaStatusUrlCandidates = () => {
  const config = getEsewaConfig();
  return [config.statusCheckUrl];
};

export const assertEsewaConfig = () => {
  const config = getEsewaConfig();
  return config;
};

const parseSignedFieldNames = (signedFieldNames) =>
  String(signedFieldNames || "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);

const buildSignedContent = (payload, signedFieldNames) => {
  const fields = parseSignedFieldNames(signedFieldNames);

  if (fields.length === 0) {
    throw new Error("signed_field_names is required to generate eSewa signature");
  }

  return fields
    .map((fieldName) => {
      const value = payload[fieldName];
      if (value === undefined || value === null || value === "") {
        throw new Error(`Missing "${fieldName}" while generating eSewa signature`);
      }

      return `${fieldName}=${value}`;
    })
    .join(",");
};

export const generateEsewaSignature = (payload, signedFieldNames) => {
  const { secretKey } = assertEsewaConfig();
  const signedContent = buildSignedContent(payload, signedFieldNames);

  return crypto.createHmac("sha256", secretKey).update(signedContent).digest("base64");
};

export const verifyEsewaSignature = (payload) => {
  if (!payload?.signature || !payload?.signed_field_names) {
    return false;
  }

  const expectedSignature = generateEsewaSignature(payload, payload.signed_field_names);
  return expectedSignature === String(payload.signature);
};

export const generateEsewaTransactionUuid = (paymentId) => {
  const suffix = String(paymentId).slice(-12);
  return `${Date.now()}-${suffix}`.replace(/[^A-Za-z0-9-]/g, "");
};

export const getBackendBaseUrl = () => getRequiredUrlEnv("BACKEND_BASE_URL");

export const getFrontendBaseUrl = () => getRequiredUrlEnv("FRONTEND_URL");

export const buildEsewaCallbackUrls = (paymentId) => {
  const baseUrl = getBackendBaseUrl();
  const encodedPaymentId = encodeURIComponent(String(paymentId));

  return {
    successUrl: `${baseUrl}/api/payments/callback/esewa?paymentId=${encodedPaymentId}&outcome=success`,
    failureUrl: `${baseUrl}/api/payments/callback/esewa?paymentId=${encodedPaymentId}&outcome=failure`,
  };
};

export const buildEsewaFormPayload = ({ amount, transactionUuid, successUrl, failureUrl }) => {
  const config = assertEsewaConfig();
  const normalizedTotalAmount = normalizeAmount(amount);

  const payload = {
    amount: normalizedTotalAmount.toFixed(2),
    tax_amount: "0.00",
    total_amount: normalizedTotalAmount.toFixed(2),
    transaction_uuid: transactionUuid,
    product_code: config.productCode,
    product_service_charge: "0.00",
    product_delivery_charge: "0.00",
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };

  return {
    ...payload,
    signature: generateEsewaSignature(payload, payload.signed_field_names),
  };
};

export const decodeEsewaResponseData = (encodedData) => {
  if (!encodedData || typeof encodedData !== "string") {
    return null;
  }

  const normalized = encodedData.replace(/ /g, "+");
  const decoded = Buffer.from(normalized, "base64").toString("utf8");
  return JSON.parse(decoded);
};

const normalizeEsewaStatus = (status) => {
  const normalized = String(status || "").trim().toUpperCase();

  switch (normalized) {
    case "COMPLETE":
      return "COMPLETE";
    case "PENDING":
      return "PENDING";
    case "FULL_REFUND":
      return "FULL_REFUND";
    case "PARTIAL_REFUND":
      return "PARTIAL_REFUND";
    case "AMBIGIOUS":
    case "AMBIGUOUS":
      return "AMBIGUOUS";
    case "NOT_FOUND":
      return "NOT_FOUND";
    case "CANCELED":
    case "CANCELLED":
      return "CANCELED";
    case "FAILED":
      return "FAILED";
    default:
      return "FAILED";
  }
};

const getProviderTransactionId = (payload) => {
  const safePayload =
    payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};

  return String(
    safePayload.transaction_code ||
      safePayload.transactionCode ||
      safePayload.ref_id ||
      safePayload.refId ||
      ""
  ).trim();
};

const getSettledAmountForPayment = (payment) => {
  if (payment.status === "COMPLETE" || payment.status === "PARTIAL_REFUND") {
    return normalizeAmount(payment.amount);
  }

  return 0;
};

export const syncOrderPaymentStatus = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const payments = await Payment.find({ order: orderId });
  const totalPaid = payments.reduce((sum, payment) => sum + getSettledAmountForPayment(payment), 0);
  const normalizedTotalPaid = normalizeAmount(totalPaid);
  const totalAmount = normalizeAmount(order.totalAmount);

  if (normalizedTotalPaid <= 0) {
    order.paymentStatus = "UNPAID";
  } else if (normalizedTotalPaid + 0.001 >= totalAmount) {
    order.paymentStatus = "PAID";
  } else {
    order.paymentStatus = "PARTIAL";
  }

  await order.save();

  return {
    order,
    totalPaid: normalizedTotalPaid,
    outstandingAmount: Math.max(normalizeAmount(totalAmount - normalizedTotalPaid), 0),
  };
};

export const getOrderPaymentSnapshot = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const payments = await Payment.find({ order: orderId }).sort({ createdAt: -1 });
  const totalPaid = payments.reduce((sum, payment) => sum + getSettledAmountForPayment(payment), 0);

  return {
    order,
    payments,
    totalPaid: normalizeAmount(totalPaid),
    outstandingAmount: Math.max(normalizeAmount(order.totalAmount - totalPaid), 0),
  };
};

export const verifyEsewaTransactionStatus = async ({ transactionUuid, totalAmount, productCode }) => {
  const config = assertEsewaConfig();
  const statusUrlCandidates = getEsewaStatusUrlCandidates();
  const errors = [];

  for (const baseUrl of statusUrlCandidates) {
    const url = new URL(baseUrl);

    url.searchParams.set("product_code", productCode || config.productCode);
    url.searchParams.set("total_amount", normalizeAmount(totalAmount).toFixed(2));
    url.searchParams.set("transaction_uuid", transactionUuid);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      let parsed;

      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error("eSewa verification returned a non-JSON response");
      }

      if (!response.ok) {
        throw new Error(parsed?.error_message || `eSewa verification failed at ${baseUrl}`);
      }

      return parsed;
    } catch (err) {
      clearTimeout(timeoutId);
      const message =
        err?.name === "AbortError"
          ? `Timed out while calling ${baseUrl}`
          : `${baseUrl} -> ${err.message || "fetch failed"}`;
      errors.push(message);
    }
  }

  throw new Error(`Unable to verify eSewa payment. Tried: ${errors.join(" | ")}`);
};

export const applyVerificationResultToPayment = async ({
  payment,
  callbackPayload = null,
  callbackSignatureValid = null,
  verificationResponse = null,
}) => {
  if (callbackPayload) {
    payment.rawCallbackPayload = callbackPayload;
    payment.callbackSignatureValid = callbackSignatureValid;
  }

  if (verificationResponse) {
    payment.rawVerificationResponse = verificationResponse;
    payment.lastCheckedAt = new Date();
    payment.status = normalizeEsewaStatus(verificationResponse.status);
    payment.providerTransactionId =
      getProviderTransactionId(verificationResponse) ||
      getProviderTransactionId(callbackPayload) ||
      payment.providerTransactionId;
  } else if (callbackPayload?.status) {
    payment.status = normalizeEsewaStatus(callbackPayload.status);
    payment.providerTransactionId =
      getProviderTransactionId(callbackPayload) || payment.providerTransactionId;
  }

  if (payment.status === "COMPLETE" && !payment.completedAt) {
    payment.completedAt = new Date();
  }

  await payment.save();

  const { order } = await syncOrderPaymentStatus(payment.order);
  return { payment, order };
};
