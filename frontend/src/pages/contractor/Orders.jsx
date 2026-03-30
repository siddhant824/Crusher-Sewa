import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createOrder, getMyOrders } from "../../services/ordersApi.js";
import { initiateEsewaPayment, verifyPayment } from "../../services/paymentsApi.js";
import { getInvoices } from "../../services/invoicesApi.js";
import { clearDraftOrder, getDraftOrder, saveDraftOrder } from "../../utils/orderDraft.js";

const statusStyles = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-teal-50 text-teal-700 border-teal-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const deliveryStyles = {
  PENDING: "bg-stone-100 text-stone-700",
  IN_PROGRESS: "bg-sky-50 text-sky-700",
  PARTIALLY_DELIVERED: "bg-violet-50 text-violet-700",
  DELIVERED: "bg-teal-50 text-teal-700",
};

const paymentStyles = {
  UNPAID: "bg-rose-50 text-rose-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  PAID: "bg-teal-50 text-teal-700",
};

const tripStatusStyles = {
  PENDING: "bg-stone-100 text-stone-700",
  IN_TRANSIT: "bg-sky-50 text-sky-700",
  DELIVERED: "bg-teal-50 text-teal-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const ACTIVE_ESEWA_PAYMENT_KEY = "cms_active_esewa_payment";
const FINAL_PAYMENT_STATUSES = new Set([
  "COMPLETE",
  "FAILED",
  "CANCELED",
  "FULL_REFUND",
  "PARTIAL_REFUND",
]);

const Orders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [draftItems, setDraftItems] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmingDraft, setConfirmingDraft] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState(null);
  const handledPaymentSearchRef = useRef("");
  const isVerifyingPaymentRef = useRef(false);
  const lastPaymentFeedbackRef = useRef("");
  const syncPaymentVerificationRef = useRef(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await getInvoices();
      const nextMap = {};
      (data.invoices || []).forEach((invoice) => {
        nextMap[String(invoice.order?._id || invoice.order)] = invoice;
      });
      setInvoiceMap(nextMap);
    } catch {
      // Allow orders page to load even if invoices are unavailable.
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyOrders();
      setOrders(data.orders || []);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [fetchInvoices]);

  useEffect(() => {
    fetchOrders();
    setDraftItems(getDraftOrder());
  }, [fetchOrders]);

  const showPaymentToast = (paymentStatus, paymentId = "") => {
    const feedbackKey = `${paymentId}:${paymentStatus}`;

    if (lastPaymentFeedbackRef.current === feedbackKey) {
      return;
    }

    lastPaymentFeedbackRef.current = feedbackKey;

    if (paymentStatus === "COMPLETE") {
      toast.success("eSewa payment completed successfully");
    } else if (paymentStatus === "PENDING") {
      toast("Payment is still pending verification");
    } else if (paymentStatus === "FAILED" || paymentStatus === "CANCELED") {
      toast.error(`Payment returned with status: ${paymentStatus}`);
    } else if (paymentStatus === "INITIATED") {
      toast("Payment session was created. Waiting for eSewa confirmation.");
    } else {
      toast(`Payment returned with status: ${paymentStatus}`);
    }
  };

  const saveActivePayment = (paymentId, orderId) => {
    sessionStorage.setItem(
      ACTIVE_ESEWA_PAYMENT_KEY,
      JSON.stringify({
        paymentId,
        orderId,
      })
    );
  };

  const getActivePayment = () => {
    try {
      const raw = sessionStorage.getItem(ACTIVE_ESEWA_PAYMENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const clearActivePayment = () => {
    sessionStorage.removeItem(ACTIVE_ESEWA_PAYMENT_KEY);
  };

  const syncPaymentVerification = async ({ paymentId, initialStatus = "" }) => {
    if (!paymentId || isVerifyingPaymentRef.current) {
      return;
    }

    isVerifyingPaymentRef.current = true;

    try {
      const verified = await verifyPayment(paymentId);
      const verifiedStatus = verified.payment?.status || initialStatus || "PENDING";
      const data = await getMyOrders();
      setOrders(data.orders || []);
      fetchInvoices();
      showPaymentToast(verifiedStatus, paymentId);

      if (FINAL_PAYMENT_STATUSES.has(verifiedStatus)) {
        clearActivePayment();
      }
    } catch {
      if (initialStatus && initialStatus !== "INITIATED") {
        showPaymentToast(initialStatus, paymentId);
      }
    } finally {
      isVerifyingPaymentRef.current = false;
      setPayingOrderId(null);
    }
  };

  syncPaymentVerificationRef.current = syncPaymentVerification;

  useEffect(() => {
    const handlePaymentMessage = async (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== "ESEWA_PAYMENT_RESULT") {
        return;
      }

      await syncPaymentVerificationRef.current?.({
        paymentId: event.data.paymentId,
        initialStatus: event.data.paymentStatus,
      });
    };

    window.addEventListener("message", handlePaymentMessage);
    return () => window.removeEventListener("message", handlePaymentMessage);
  }, []);

  useEffect(() => {
    const checkActivePayment = async () => {
      const activePayment = getActivePayment();

      if (!activePayment?.paymentId) {
        return;
      }

      await syncPaymentVerificationRef.current?.({
        paymentId: activePayment.paymentId,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkActivePayment();
      }
    };

    window.addEventListener("focus", checkActivePayment);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    checkActivePayment();

    return () => {
      window.removeEventListener("focus", checkActivePayment);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("paymentStatus");

    if (!paymentStatus) {
      return;
    }

    if (handledPaymentSearchRef.current === location.search) {
      return;
    }

    handledPaymentSearchRef.current = location.search;

    const refreshOrdersAfterPayment = async () => {
      try {
        const data = await getMyOrders();
        setOrders(data.orders || []);
        fetchInvoices();
        showPaymentToast(paymentStatus, params.get("paymentId") || "");
      } catch (err) {
        toast.error(err.message || "Failed to refresh orders after payment");
      } finally {
        handledPaymentSearchRef.current = "";
        navigate(location.pathname, { replace: true });
      }
    };

    refreshOrdersAfterPayment();
  }, [fetchInvoices, location.pathname, location.search, navigate]);

  const updateDraftItems = (updater) => {
    setDraftItems((current) => {
      const nextItems = updater(current)
        .map((item) => {
          const quantity = Number(item.quantity);
          const ratePerCuMetre = Number(item.ratePerCuMetre);

          if (quantity <= 0) {
            return null;
          }

          return {
            ...item,
            quantity,
            ratePerCuMetre,
            subtotal: Number((quantity * ratePerCuMetre).toFixed(2)),
          };
        })
        .filter(Boolean);

      saveDraftOrder(nextItems);
      return nextItems;
    });
  };

  const draftTotal = draftItems.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );

  const handleConfirmDraft = async () => {
    if (draftItems.length === 0) {
      toast.error("There is no draft order to confirm");
      return;
    }

    setConfirmingDraft(true);
    try {
      const payload = draftItems.map((item) => ({
        materialId: item.materialId,
        quantity: Number(item.quantity),
      }));

      const data = await createOrder(payload);
      toast.success(data.message || "Order placed successfully");
      clearDraftOrder();
      setDraftItems([]);
      setOrders((current) => [data.order, ...current]);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || "Failed to confirm draft order");
    } finally {
      setConfirmingDraft(false);
    }
  };

  const submitEsewaForm = (formUrl, fields, target) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = formUrl;
    form.target = target;

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    window.setTimeout(() => form.remove(), 0);
  };

  const handleEsewaPayment = async (orderId) => {
    setPayingOrderId(orderId);
    try {
      const data = await initiateEsewaPayment(orderId);
      saveActivePayment(data.payment?._id, orderId);
      submitEsewaForm(data.esewa.formUrl, data.esewa.fields, "esewa-payment-window");
      setPayingOrderId(null);
      toast("Complete the payment in the eSewa tab. This page will update automatically.");
    } catch (err) {
      toast.error(err.message || "Failed to start eSewa payment");
      setPayingOrderId(null);
    }
  };

  const handleDraftQuantityChange = (materialId, value) => {
    updateDraftItems((current) =>
      current.map((item) =>
        item.materialId === materialId
          ? { ...item, quantity: value === "" ? "" : Number(value) }
          : item
      )
    );
  };

  const changeDraftQuantity = (materialId, delta) => {
    updateDraftItems((current) =>
      current.map((item) =>
        item.materialId === materialId
          ? { ...item, quantity: Math.max(Number(item.quantity || 0) + delta, 0) }
          : item
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#eff6ff_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              Order Tracking
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Manage draft orders and track deliveries</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              Keep an eye on approvals, delivery progress, and payment status from one clean place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Draft</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{draftItems.length}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Orders</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Pending</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">
                {orders.filter((order) => order.orderStatus === "PENDING").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {draftItems.length > 0 && (
        <div className="mb-6 rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#fff7ed_100%)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Draft Order</h2>
              <p className="text-sm text-amber-700 mt-1">
                These items were added from Materials and will stay here until you place the order.
              </p>
            </div>
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-white text-amber-700 border border-amber-200">
              Awaiting confirmation
            </span>
          </div>

          <div className="space-y-3">
            {draftItems.map((item) => (
              <div
                key={`draft-${item.materialId}`}
                className="flex flex-col gap-4 rounded-2xl border border-amber-100 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-medium text-stone-900">{item.name}</p>
                  <p className="text-sm text-stone-500">
                    {item.quantity} {item.unit} x Rs. {Number(item.ratePerCuMetre).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => changeDraftQuantity(item.materialId, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => handleDraftQuantityChange(item.materialId, e.target.value)}
                      className="w-16 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-center text-sm font-medium text-stone-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => changeDraftQuantity(item.materialId, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-medium text-stone-900 min-w-24 text-right">
                    Rs. {Number(item.subtotal).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-amber-700">Draft Total</p>
              <p className="text-2xl font-semibold text-stone-900">
                Rs. {draftTotal.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleConfirmDraft}
              disabled={confirmingDraft}
              className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmingDraft ? "Confirming..." : "Confirm Order"}
            </button>
          </div>
        </div>
      )}

      {orders.length === 0 && draftItems.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-stone-900 mb-2">No orders yet</h3>
          <p className="text-stone-500 max-w-sm mx-auto">
            When you place orders for materials, they will appear here and move through approval, delivery, and payment stages.
          </p>
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-5">
          {orders.map((order) => (
            <div key={order._id} className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-stone-400">
                    Order placed on {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <p className="text-lg font-semibold text-stone-900 mt-1">
                    Total: Rs. {order.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${statusStyles[order.orderStatus] || statusStyles.PENDING}`}>
                    {order.orderStatus}
                  </span>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${deliveryStyles[order.deliveryStatus] || deliveryStyles.PENDING}`}>
                    Delivery: {order.deliveryStatus}
                  </span>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${paymentStyles[order.paymentStatus] || paymentStyles.UNPAID}`}>
                    Payment: {order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={`${order._id}-${item.material?._id || item.materialName}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 p-4"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{item.materialName}</p>
                      <p className="text-sm text-stone-500">
                        {item.quantity} {item.unit} x Rs. {item.ratePerCuMetre.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-medium text-stone-900">
                      Rs. {item.subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {order.orderStatus === "APPROVED" && order.paymentStatus !== "PAID" && (
                <div className="mt-4 border-t border-stone-100 pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">Online Payment</p>
                    <p className="text-sm text-stone-500">
                      Pay the remaining amount for this approved order through eSewa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEsewaPayment(order._id)}
                    disabled={payingOrderId === order._id}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {payingOrderId === order._id ? "Redirecting..." : "Pay with eSewa"}
                  </button>
                </div>
              )}

              {invoiceMap[order._id] && (
                <div className="mt-4 border-t border-stone-100 pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">Invoice Ready</p>
                    <p className="text-sm text-stone-500">
                      Invoice {invoiceMap[order._id].invoiceNumber} is available to view or save as PDF.
                    </p>
                  </div>
                  <Link
                    to={`/contractor/invoices/${invoiceMap[order._id]._id}`}
                    className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    View Invoice
                  </Link>
                </div>
              )}

              {order.deliveryTrips?.length > 0 && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <h3 className="font-medium text-stone-900 mb-3">Delivery Trips</h3>
                  <div className="space-y-3">
                    {order.deliveryTrips.map((trip) => (
                      <div
                        key={trip._id}
                        className="flex flex-col gap-3 rounded-2xl border border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-stone-900">Trip #{trip.tripNumber}</p>
                          <p className="text-sm text-stone-500">
                            {trip.materialName}: {trip.deliveredQuantity} {trip.unit} via {trip.truck?.name} ({trip.truck?.plateNumber})
                          </p>
                          {trip.dispatchedAt && (
                            <p className="text-xs text-stone-400 mt-1">
                              Dispatched: {new Date(trip.dispatchedAt).toLocaleString()}
                            </p>
                          )}
                          {trip.deliveredAt && (
                            <p className="text-xs text-stone-400 mt-1">
                              Delivered: {new Date(trip.deliveredAt).toLocaleString()}
                            </p>
                          )}
                          {trip.note && (
                            <p className="text-sm text-stone-600 mt-1">{trip.note}</p>
                          )}
                        </div>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${tripStatusStyles[trip.status] || tripStatusStyles.PENDING}`}>
                          {trip.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Order Status Guide */}
      <div className="mt-8 rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Order Status Guide</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { status: "Pending", color: "bg-amber-500", desc: "Order received, awaiting confirmation" },
            { status: "Confirmed", color: "bg-sky-500", desc: "Order confirmed, preparing for dispatch" },
            { status: "In Transit", color: "bg-violet-500", desc: "Materials on the way to your site" },
            { status: "Delivered", color: "bg-teal-500", desc: "Order delivered successfully" },
          ].map((item) => (
            <div key={item.status} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                <span className="font-medium text-stone-900 text-sm">{item.status}</span>
              </div>
              <p className="text-xs text-stone-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orders;
