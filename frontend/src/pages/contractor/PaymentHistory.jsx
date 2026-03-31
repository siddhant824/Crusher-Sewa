import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyOrders } from "../../services/ordersApi.js";
import { getMyPayments, initiateEsewaPayment, verifyPayment } from "../../services/paymentsApi.js";

const statusStyles = {
  COMPLETE: "bg-teal-50 text-teal-700",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-rose-50 text-rose-700",
  INITIATED: "bg-sky-50 text-sky-700",
  CANCELED: "bg-stone-100 text-stone-700",
};

const ACTIVE_ESEWA_PAYMENT_KEY = "cms_active_esewa_payment";
const FINAL_PAYMENT_STATUSES = new Set([
  "COMPLETE",
  "FAILED",
  "CANCELED",
  "FULL_REFUND",
  "PARTIAL_REFUND",
]);

const successfulStatuses = new Set(["COMPLETE", "PARTIAL_REFUND"]);

const PaymentHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [payingOrderId, setPayingOrderId] = useState(null);
  const handledPaymentSearchRef = useRef("");
  const isVerifyingPaymentRef = useRef(false);
  const lastPaymentFeedbackRef = useRef("");
  const syncPaymentVerificationRef = useRef(null);

  const fetchPaymentsAndOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsData, ordersData] = await Promise.all([getMyPayments(), getMyOrders()]);
      setPayments(paymentsData.payments || []);
      setOrders(ordersData.orders || []);
    } catch (err) {
      toast.error(err.message || "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentsAndOrders();
  }, [fetchPaymentsAndOrders]);

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
      await fetchPaymentsAndOrders();
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

    const refreshAfterPayment = async () => {
      try {
        await fetchPaymentsAndOrders();
        showPaymentToast(paymentStatus, params.get("paymentId") || "");
      } catch (err) {
        toast.error(err.message || "Failed to refresh payments after payment");
      } finally {
        handledPaymentSearchRef.current = "";
        navigate(location.pathname, { replace: true });
      }
    };

    refreshAfterPayment();
  }, [fetchPaymentsAndOrders, location.pathname, location.search, navigate]);

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

  const handleEsewaPayment = async (orderId, amount) => {
    setPayingOrderId(orderId);
    try {
      const data = await initiateEsewaPayment(orderId, amount);
      saveActivePayment(data.payment?._id, orderId);
      submitEsewaForm(data.esewa.formUrl, data.esewa.fields, "esewa-payment-window");
      setPayingOrderId(null);
      toast("Complete the payment in the eSewa tab. This page will update automatically.");
    } catch (err) {
      toast.error(err.message || "Failed to start eSewa payment");
      setPayingOrderId(null);
    }
  };

  const selectedOrderId = searchParams.get("order") || "";

  const orderPaymentMap = useMemo(() => {
    return payments.reduce((acc, payment) => {
      const orderId = String(payment.order?._id || payment.order || "");
      if (!orderId) {
        return acc;
      }

      const amount = Number(payment.amount || 0);
      if (!acc[orderId]) {
        acc[orderId] = 0;
      }

      if (successfulStatuses.has(payment.status)) {
        acc[orderId] += amount;
      }

      return acc;
    }, {});
  }, [payments]);

  const payableOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (selectedOrderId && order._id !== selectedOrderId) {
          return false;
        }

        return order.orderStatus === "APPROVED" && order.paymentStatus !== "PAID";
      })
      .map((order) => {
        const paidAmount = Number(orderPaymentMap[order._id] || 0);
        const totalAmount = Number(order.totalAmount || 0);

        return {
          ...order,
          paidAmount,
          outstandingAmount: Math.max(totalAmount - paidAmount, 0),
        };
      });
  }, [orderPaymentMap, orders, selectedOrderId]);

  const filteredPayments = useMemo(() => {
    const visiblePayments = selectedOrderId
      ? payments.filter((payment) => String(payment.order?._id || payment.order) === selectedOrderId)
      : payments;

    if (!searchQuery.trim()) {
      return visiblePayments;
    }

    const query = searchQuery.trim().toLowerCase();
    return visiblePayments.filter((payment) => {
      const transactionId = String(payment.providerTransactionId || payment.transactionUuid || "").toLowerCase();
      const provider = String(payment.provider || "").toLowerCase();
      return transactionId.includes(query) || provider.includes(query);
    });
  }, [payments, searchQuery, selectedOrderId]);

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading payment history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#eefbf7_0%,#ffffff_45%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              Payment Records
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Payments and dues</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              Pay approved orders here and keep your full transaction history in one dedicated page.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Transactions</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{payments.length}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Pending Dues</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{payableOrders.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {payableOrders.map((order, index) => (
          <div key={order._id} className="rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_100%)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Due Order {index + 1}
                  </span>
                  <p className="text-sm text-stone-500">
                    Approved on {new Date(order.approvedAt || order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Order Total</p>
                    <p className="mt-1 font-semibold text-stone-900">Rs. {Number(order.totalAmount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Paid</p>
                    <p className="mt-1 font-semibold text-stone-900">Rs. {order.paidAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Remaining</p>
                    <p className="mt-1 font-semibold text-amber-700">Rs. {order.outstandingAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/contractor/orders?order=${order._id}`}
                  className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  View Order
                </Link>
                <button
                  type="button"
                  onClick={() => handleEsewaPayment(order._id, order.outstandingAmount)}
                  disabled={payingOrderId === order._id}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {payingOrderId === order._id ? "Redirecting..." : "Pay with eSewa"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {payableOrders.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
            No approved orders are waiting for payment right now.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transaction or method of payment"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          {selectedOrderId && (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Clear selected order
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-stone-50">
              <tr className="border-b border-stone-200">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Order</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Method of Payment</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Transaction</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Reference</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPayments.map((payment) => (
                <tr key={payment._id}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-stone-900">Rs. {Number(payment.order?.totalAmount || 0).toFixed(2)}</p>
                    <p className="text-sm text-stone-500">
                      Order status: {payment.order?.orderStatus || "-"} | Payment: {payment.order?.paymentStatus || "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {payment.provider === "MANUAL" ? "Cash" : payment.provider === "ESEWA" ? "eSewa" : "-"}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-stone-900">
                    Rs. {Number(payment.amount).toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[payment.status] || "bg-stone-100 text-stone-700"}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {payment.providerTransactionId || payment.transactionUuid}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {new Date(payment.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-stone-500">
                    No payment history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
