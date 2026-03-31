import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getAllOrders, updateOrderStatus } from "../services/ordersApi.js";

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

const OrdersManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/manager";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedUsers, setExpandedUsers] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(data.orders || []);
    } catch (err) {
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, nextStatus) => {
    setActingId(orderId);
    try {
      const data = await updateOrderStatus(orderId, nextStatus);
      toast.success(data.message || `Order ${nextStatus.toLowerCase()} successfully`);
      setOrders((current) =>
        current.map((order) => (order._id === orderId ? data.order : order))
      );

      if (nextStatus === "APPROVED") {
        navigate(`${basePath}/orders/${orderId}/delivery`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to update order");
    } finally {
      setActingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") {
      return orders;
    }

    return orders.filter((order) => order.orderStatus === statusFilter);
  }, [orders, statusFilter]);

  const groupedOrders = useMemo(() => {
    const groups = new Map();

    filteredOrders.forEach((order) => {
      const key = order.contractor?._id || order.contractor?.email || "unknown";
      const existing = groups.get(key);

      if (existing) {
        existing.orders.push(order);
        return;
      }

      groups.set(key, {
        key,
        contractor: order.contractor,
        orders: [order],
      });
    });

    return Array.from(groups.values());
  }, [filteredOrders]);

  const toggleUserExpanded = (groupKey) => {
    setExpandedUsers((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Orders</h1>
        <p className="mt-1 text-stone-500">
          Review orders by contractor, then open delivery for the exact order you want to dispatch.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-900">Filter by status</p>
            <p className="mt-1 text-xs text-stone-500">
              {filteredOrders.length} of {orders.length} orders shown
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "ALL", label: "All" },
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  statusFilter === option.value
                    ? "bg-teal-600 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <p className="font-medium text-stone-600">No orders yet</p>
          <p className="mt-1 text-sm text-stone-400">
            Contractor orders will appear here once they are placed.
          </p>
        </div>
      ) : groupedOrders.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <p className="font-medium text-stone-600">
            No {statusFilter.toLowerCase()} orders found
          </p>
          <p className="mt-1 text-sm text-stone-400">
            Try switching the filter to view other orders.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedOrders.map((group) => (
            <section
              key={group.key}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white"
            >
              {(() => {
                const isExpanded = expandedUsers[group.key] ?? false;

                return (
                  <>
              <div className="border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Contractor
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-stone-900">
                      {group.contractor?.name || "Contractor"}
                    </h2>
                    <p className="mt-1 text-sm text-stone-500">{group.contractor?.email}</p>
                  </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                        Orders
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-900">
                        {group.orders.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                        Approved
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-900">
                        {group.orders.filter((order) => order.orderStatus === "APPROVED").length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                        Pending
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-900">
                        {group.orders.filter((order) => order.orderStatus === "PENDING").length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleUserExpanded(group.key)}
                      className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      {isExpanded ? "Show Less" : "Expand More"}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded ? (
              <div className="space-y-4 bg-stone-50/70 p-4">
                {group.orders.map((order, index) => (
                  <div
                    key={order._id}
                    className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02]"
                  >
                    <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          <span>Order {index + 1}</span>
                          <span className="h-1 w-1 rounded-full bg-stone-300"></span>
                          <span className="normal-case tracking-normal text-stone-600">
                            {group.contractor?.name || "Contractor"}
                          </span>
                        </div>
                        <p className="mt-3 text-base font-semibold text-stone-900">
                          Placed on {new Date(order.createdAt).toLocaleString()}
                        </p>
                        {order.approvedBy ? (
                          <p className="mt-1 text-xs text-stone-500">
                            Reviewed by {order.approvedBy.name} on{" "}
                            {new Date(order.approvedAt).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            statusStyles[order.orderStatus] || statusStyles.PENDING
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            deliveryStyles[order.deliveryStatus] || deliveryStyles.PENDING
                          }`}
                        >
                          Delivery: {order.deliveryStatus}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            paymentStyles[order.paymentStatus] || paymentStyles.UNPAID
                          }`}
                        >
                          Payment: {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                          Items
                        </p>
                        <p className="mt-2 text-base font-semibold text-stone-900">
                          {order.items.length} material{order.items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                          Delivery
                        </p>
                        <p className="mt-2 text-base font-semibold text-stone-900">
                          {order.deliveryStatus.replaceAll("_", " ")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                          Total
                        </p>
                        <p className="mt-2 text-base font-semibold text-stone-900">
                          Rs. {order.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-stone-200">
                      <table className="w-full text-sm">
                        <thead className="bg-stone-50">
                          <tr className="border-b border-stone-200 text-left text-stone-500">
                            <th className="px-4 py-3">Material</th>
                            <th className="px-4 py-3">Qty</th>
                            <th className="px-4 py-3">Rate</th>
                            <th className="px-4 py-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, itemIndex) => (
                            <tr
                              key={`${order._id}-${item.material?._id || item.materialName}`}
                              className="border-b border-stone-50 last:border-b-0"
                            >
                              <td className="px-4 py-3 text-stone-900">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                                    {itemIndex + 1}
                                  </span>
                                  <span>{item.materialName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-stone-600">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="px-4 py-3 text-stone-600">
                                Rs. {item.ratePerCuMetre.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-stone-900">
                                Rs. {item.subtotal.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                          Order Total
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-stone-900">
                          Rs. {order.totalAmount.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {order.orderStatus === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              disabled={actingId === order._id}
                              onClick={() => handleStatusUpdate(order._id, "APPROVED")}
                              className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actingId === order._id}
                              onClick={() => handleStatusUpdate(order._id, "REJECTED")}
                              className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : null}

                        {order.orderStatus === "APPROVED" ? (
                          <button
                            type="button"
                            onClick={() => navigate(`${basePath}/orders/${order._id}/delivery`)}
                            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Manage Delivery
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="flex items-center justify-between bg-stone-50/70 px-5 py-4 text-sm text-stone-500">
                  <p>
                    {group.orders.length} order{group.orders.length === 1 ? "" : "s"} hidden for this contractor.
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleUserExpanded(group.key)}
                    className="font-medium text-stone-700 hover:text-stone-900"
                  >
                    View Orders
                  </button>
                </div>
              )}
                  </>
                );
              })()}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
