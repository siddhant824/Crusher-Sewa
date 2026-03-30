import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyPayments } from "../../services/paymentsApi.js";

const statusStyles = {
  COMPLETE: "bg-teal-50 text-teal-700",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-rose-50 text-rose-700",
  INITIATED: "bg-sky-50 text-sky-700",
  CANCELED: "bg-stone-100 text-stone-700",
};

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const data = await getMyPayments();
        setPayments(data.payments || []);
      } catch (err) {
        toast.error(err.message || "Failed to load payment history");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) {
      return payments;
    }

    const query = searchQuery.trim().toLowerCase();
    return payments.filter((payment) => {
      const transactionId = String(payment.providerTransactionId || payment.transactionUuid || "").toLowerCase();
      const provider = String(payment.provider || "").toLowerCase();
      return transactionId.includes(query) || provider.includes(query);
    });
  }, [payments, searchQuery]);

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading payment history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#eefbf7_0%,#ffffff_45%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              Payment Records
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Payment History</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              View your completed, pending, and previous payment transactions in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Transactions</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{payments.length}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Complete</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">
                {payments.filter((payment) => payment.status === "COMPLETE").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transaction or method of payment"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
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

      <div className="flex justify-end">
        <Link
          to="/contractor/orders"
          className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Back to Orders
        </Link>
      </div>
    </div>
  );
};

export default PaymentHistory;
