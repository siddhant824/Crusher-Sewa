import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getAllOrders } from "../services/ordersApi.js";
import { getAllPayments, getPaymentSummary, recordManualPayment } from "../services/paymentsApi.js";

const statusStyles = {
  COMPLETE: "bg-teal-50 text-teal-700",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-rose-50 text-rose-700",
  INITIATED: "bg-sky-50 text-sky-700",
  CANCELED: "bg-stone-100 text-stone-700",
};

const PaymentManagement = () => {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    orderId: "",
    amount: "",
    referenceId: "",
    note: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, paymentsData, ordersData] = await Promise.all([
        getPaymentSummary(),
        getAllPayments(),
        getAllOrders(),
      ]);

      setSummary(summaryData.summary);
      setPayments(paymentsData.payments || []);
      setOrders((ordersData.orders || []).filter((order) => order.orderStatus === "APPROVED"));
    } catch (err) {
      toast.error(err.message || "Failed to load payment management");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const orderOptions = useMemo(
    () => orders.filter((order) => order.paymentStatus !== "PAID"),
    [orders]
  );

  const paymentRows = useMemo(() => {
    const latestPaymentByOrder = new Map();

    payments.forEach((payment) => {
      const orderId = String(payment.order?._id || payment.order || "");
      if (!orderId) {
        return;
      }

      const current = latestPaymentByOrder.get(orderId);
      if (!current || new Date(payment.createdAt) > new Date(current.createdAt)) {
        latestPaymentByOrder.set(orderId, payment);
      }
    });

    return orders.map((order) => ({
      order,
      latestPayment: latestPaymentByOrder.get(String(order._id)) || null,
    }));
  }, [orders, payments]);

  const filteredRows = useMemo(() => {
    let rows = [...paymentRows];

    if (orderPaymentStatusFilter) {
      rows = rows.filter(
        ({ order }) => String(order.paymentStatus || "") === orderPaymentStatusFilter
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      rows = rows.filter(({ order, latestPayment }) => {
        const contractorName = order.contractor?.name?.toLowerCase() || "";
        const contractorEmail = order.contractor?.email?.toLowerCase() || "";
        const transactionId = String(
          latestPayment?.providerTransactionId || latestPayment?.transactionUuid || ""
        ).toLowerCase();

        return (
          contractorName.includes(query) ||
          contractorEmail.includes(query) ||
          transactionId.includes(query)
        );
      });
    }

    if (paymentMethodFilter) {
      rows = rows.filter(({ latestPayment }) => {
        const method = latestPayment?.provider === "MANUAL" ? "CASH" : latestPayment?.provider || "";
        return method === paymentMethodFilter;
      });
    }

    return rows;
  }, [orderPaymentStatusFilter, paymentMethodFilter, paymentRows, searchQuery]);

  const selectedOrder = orderOptions.find((order) => order._id === form.orderId);

  const handleManualPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await recordManualPayment({
        orderId: form.orderId,
        amount: Number(form.amount),
        referenceId: form.referenceId,
        note: form.note,
      });
      toast.success("Manual payment recorded successfully");
      setForm({ orderId: "", amount: "", referenceId: "", note: "" });
      setShowForm(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to record manual payment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Payments</h1>
          <p className="mt-1 text-stone-500">
            Review payment records and record cash or partial settlements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          {showForm ? "Hide Cash Payment" : "Record Cash Payment"}
        </button>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">Total Transactions</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">{summary.totalTransactions}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">Collected</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">Rs. {summary.totalCollected.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">Unpaid Amount</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">Rs. {summary.unpaidAmountTotal.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">Partial Payment Total</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">Rs. {summary.partialPaymentTotal.toFixed(2)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleManualPayment} className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-900">Record Cash Payment</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <select
              value={form.orderId}
              onChange={(e) => setForm((current) => ({ ...current, orderId: e.target.value }))}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              required
            >
              <option value="">Select order</option>
              {orderOptions.map((order) => (
                <option key={order._id} value={order._id}>
                  {order.contractor?.name} - Rs. {Number(order.totalAmount).toFixed(2)} ({order.paymentStatus})
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
              placeholder="Amount"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              value={form.referenceId}
              onChange={(e) => setForm((current) => ({ ...current, referenceId: e.target.value }))}
              placeholder="Reference ID"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))}
              placeholder="Note"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          {selectedOrder && (
            <p className="mt-3 text-xs text-stone-500">
              Order total: Rs. {Number(selectedOrder.totalAmount).toFixed(2)} | Current status: {selectedOrder.paymentStatus}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Cash Payment"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contractor or transaction"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <select
            value={orderPaymentStatusFilter}
            onChange={(e) => setOrderPaymentStatusFilter(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Order Payment Status</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Method of Payment</option>
            <option value="ESEWA">eSewa</option>
            <option value="CASH">Cash</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-stone-50">
              <tr className="border-b border-stone-200">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Contractor</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Order</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Order Payment</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Method of Payment</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Transaction</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Reference</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRows.map(({ order, latestPayment }) => (
                <tr key={order._id}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-stone-900">{order.contractor?.name}</p>
                    <p className="text-sm text-stone-500">{order.contractor?.email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    Rs. {Number(order.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      order.paymentStatus === "PAID"
                        ? "bg-teal-50 text-teal-700"
                        : order.paymentStatus === "PARTIAL"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {latestPayment?.provider === "MANUAL"
                      ? "Cash"
                      : latestPayment?.provider === "ESEWA"
                        ? "eSewa"
                        : "-"}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-stone-900">
                    {latestPayment ? `Rs. ${Number(latestPayment.amount).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-5 py-4">
                    {latestPayment ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[latestPayment.status] || "bg-stone-100 text-stone-700"}`}>
                        {latestPayment.status}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                        No payment yet
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {latestPayment?.providerTransactionId || latestPayment?.transactionUuid || "-"}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {latestPayment ? new Date(latestPayment.createdAt).toLocaleString() : new Date(order.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-stone-500">
                    No payment records found.
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

export default PaymentManagement;
