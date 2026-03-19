import { useEffect, useMemo, useState } from "react";
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

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
        <p className="text-stone-500 mt-1">
          Review contractor orders and update approval status.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-900">Filter by status</p>
            <p className="text-xs text-stone-500 mt-1">
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
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <p className="text-stone-600 font-medium">No orders yet</p>
          <p className="text-sm text-stone-400 mt-1">
            Contractor orders will appear here once they are placed.
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <p className="text-stone-600 font-medium">No {statusFilter.toLowerCase()} orders found</p>
          <p className="text-sm text-stone-400 mt-1">
            Try switching the filter to view other orders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    {order.contractor?.name || "Contractor"}
                  </h2>
                  <p className="text-sm text-stone-500">{order.contractor?.email}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Placed on {new Date(order.createdAt).toLocaleString()}
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

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-stone-500 border-b border-stone-100">
                      <th className="py-2">Material</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2">Rate</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={`${order._id}-${item.material?._id || item.materialName}`} className="border-b border-stone-50 last:border-b-0">
                        <td className="py-3 text-stone-900">{item.materialName}</td>
                        <td className="py-3 text-stone-600">{item.quantity} {item.unit}</td>
                        <td className="py-3 text-stone-600">Rs. {item.ratePerCuMetre.toFixed(2)}</td>
                        <td className="py-3 text-right text-stone-900">Rs. {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-stone-900">
                    Total: Rs. {order.totalAmount.toFixed(2)}
                  </p>
                  {order.approvedBy && (
                    <p className="text-xs text-stone-500 mt-1">
                      Reviewed by {order.approvedBy.name} on {new Date(order.approvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {order.orderStatus === "PENDING" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actingId === order._id}
                      onClick={() => handleStatusUpdate(order._id, "APPROVED")}
                      className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actingId === order._id}
                      onClick={() => handleStatusUpdate(order._id, "REJECTED")}
                      className="px-4 py-2 text-sm bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        order.orderStatus === "APPROVED"
                          ? "border-teal-200 bg-teal-50 text-teal-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          order.orderStatus === "APPROVED" ? "bg-teal-500" : "bg-rose-500"
                        }`}
                      ></span>
                      {order.orderStatus === "APPROVED" ? "Approved" : "Rejected"}
                    </span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
