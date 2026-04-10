import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyOrders } from "../../services/ordersApi.js";
import { getInvoices } from "../../services/invoicesApi.js";

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

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await getInvoices();
      const nextMap = {};
      (data.invoices || []).forEach((invoice) => {
        nextMap[String(invoice.order?._id || invoice.order)] = invoice;
      });
      setInvoiceMap(nextMap);
    } catch {
      // Keep orders usable even if invoices are unavailable.
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyOrders();
      setOrders(data.orders || []);
      await fetchInvoices();
    } catch (err) {
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [fetchInvoices]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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
              Orders Overview
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Review your orders without the clutter</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              Keep this page focused on order summaries. Use Deliveries and Payments for the next steps.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Orders</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Approved</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">
                {orders.filter((order) => order.orderStatus === "APPROVED").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
            <svg className="h-8 w-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-stone-900">No orders yet</h3>
          <p className="mx-auto max-w-sm text-stone-500">
            When you place orders for materials, they will appear here with their approval, delivery, and payment progress.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order, index) => {
            const invoice = invoiceMap[order._id];

            return (
              <div key={order._id} className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 border-b border-stone-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                        Order {index + 1}
                      </span>
                      <p className="text-sm text-stone-500">
                        Placed on {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-stone-900">
                      Rs. {Number(order.totalAmount).toFixed(2)}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {order.items.length} material{order.items.length > 1 ? "s" : ""} in this order
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[order.orderStatus] || statusStyles.PENDING}`}>
                      {order.orderStatus}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${deliveryStyles[order.deliveryStatus] || deliveryStyles.PENDING}`}>
                      Delivery: {order.deliveryStatus}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${paymentStyles[order.paymentStatus] || paymentStyles.UNPAID}`}>
                      Payment: {order.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-stone-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead className="bg-stone-50">
                        <tr className="border-b border-stone-200">
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">#</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Material</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Quantity</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Rate</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {order.items.map((item, itemIndex) => (
                          <tr key={`${order._id}-${item.material?._id || item.materialName}`}>
                            <td className="px-5 py-4 text-sm font-medium text-stone-500">{itemIndex + 1}</td>
                            <td className="px-5 py-4">
                              <p className="font-medium text-stone-900">{item.materialName}</p>
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-600">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-600">
                              Rs. {Number(item.ratePerCuMetre).toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-semibold text-stone-900">
                              Rs. {Number(item.subtotal).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Delivery</p>
                    <p className="mt-2 font-semibold text-stone-900">
                      {order.deliveryTrips?.length ? `${order.deliveryTrips.length} trip${order.deliveryTrips.length > 1 ? "s" : ""} tracked` : "No trips assigned yet"}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      Use Deliveries to track truck trips and delivery progress.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Payment</p>
                    <p className="mt-2 font-semibold text-stone-900">
                      {order.paymentStatus === "PAID" ? "Fully settled" : "Action available in Payments"}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      Pay approved orders and review transaction history in one place.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Invoice</p>
                    <p className="mt-2 font-semibold text-stone-900">
                      {invoice ? invoice.invoiceNumber : "Invoice not generated yet"}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      View and download your invoice in Payments.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
                  <Link
                    to={`/contractor/deliveries?order=${order._id}`}
                    className="rounded-2xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    Track Delivery
                  </Link>
                  <Link
                    to={`/contractor/payments?order=${order._id}`}
                    className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    Payments
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
