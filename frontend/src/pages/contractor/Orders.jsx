import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { createOrder, getMyOrders } from "../../services/ordersApi.js";
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

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [draftItems, setDraftItems] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmingDraft, setConfirmingDraft] = useState(false);

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
    setDraftItems(getDraftOrder());
  }, [fetchOrders]);

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
              Orders Overview
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Review your orders without the clutter</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              Keep this page focused on order summaries. Use Deliveries, Invoices, and Payments for the next steps.
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
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Approved</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">
                {orders.filter((order) => order.orderStatus === "APPROVED").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {draftItems.length > 0 && (
        <div className="mb-6 rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#fff7ed_100%)] p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Draft Order</h2>
              <p className="mt-1 text-sm text-amber-700">
                These items stay here until you confirm and submit the order.
              </p>
            </div>
            <span className="inline-flex rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700">
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                  <p className="min-w-24 text-right font-medium text-stone-900">
                    Rs. {Number(item.subtotal).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-amber-700">Draft Total</p>
              <p className="text-2xl font-semibold text-stone-900">Rs. {draftTotal.toFixed(2)}</p>
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
      ) : orders.length > 0 ? (
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
                      View and download your invoices from the Invoices page.
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
                    className="rounded-2xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    Payments
                  </Link>
                  <Link
                    to={`/contractor/invoices?order=${order._id}`}
                    className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    {invoice ? "View Invoice" : "Invoices"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default Orders;
