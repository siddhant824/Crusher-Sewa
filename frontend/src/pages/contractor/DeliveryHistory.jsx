import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getMyOrders } from "../../services/ordersApi.js";

const deliveryStyles = {
  PENDING: "bg-stone-100 text-stone-700",
  IN_PROGRESS: "bg-sky-50 text-sky-700",
  PARTIALLY_DELIVERED: "bg-violet-50 text-violet-700",
  DELIVERED: "bg-teal-50 text-teal-700",
};

const tripStatusStyles = {
  PENDING: "bg-stone-100 text-stone-700",
  IN_TRANSIT: "bg-sky-50 text-sky-700",
  DELIVERED: "bg-teal-50 text-teal-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const DeliveryHistory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await getMyOrders();
        setOrders(data.orders || []);
      } catch (err) {
        toast.error(err.message || "Failed to load delivery tracking");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const selectedOrderId = searchParams.get("order") || "";

  const deliveryOrders = useMemo(() => {
    return orders.filter((order) => {
      if (selectedOrderId && order._id !== selectedOrderId) {
        return false;
      }

      if (statusFilter && order.deliveryStatus !== statusFilter) {
        return false;
      }

      return order.orderStatus === "APPROVED" || (order.deliveryTrips || []).length > 0;
    });
  }, [orders, selectedOrderId, statusFilter]);

  const summary = useMemo(() => {
    const tripCount = deliveryOrders.reduce(
      (sum, order) => sum + (order.deliveryTrips?.length || 0),
      0
    );

    return {
      orders: deliveryOrders.length,
      trips: tripCount,
      delivered: deliveryOrders.filter((order) => order.deliveryStatus === "DELIVERED").length,
    };
  }, [deliveryOrders]);

  const clearOrderFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("order");
    setSearchParams(next);
  };

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading delivery tracking...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_45%,#f0fdfa_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              Deliveries
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Track truck trips separately from orders</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              Follow trip progress, delivered quantities, and truck movements without crowding your order list.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Orders</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{summary.orders}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Trips</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{summary.trips}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Delivered</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{summary.delivered}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
          >
            <option value="">All Delivery Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PARTIALLY_DELIVERED">Partially Delivered</option>
            <option value="DELIVERED">Delivered</option>
          </select>
          {selectedOrderId && (
            <button
              type="button"
              onClick={clearOrderFilter}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Clear selected order
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {deliveryOrders.map((order, index) => {
          const deliveredByMaterial = order.items.reduce((acc, item) => {
            const delivered = (order.deliveryTrips || []).reduce((sum, trip) => {
              if (trip.status !== "DELIVERED") {
                return sum;
              }

              return trip.materialName === item.materialName
                ? sum + Number(trip.deliveredQuantity || 0)
                : sum;
            }, 0);

            acc[item.materialName] = delivered;
            return acc;
          }, {});

          return (
            <div key={order._id} className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 border-b border-stone-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                      Delivery {index + 1}
                    </span>
                    <p className="text-sm text-stone-500">
                      Order placed on {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-stone-900">
                    Total: Rs. {Number(order.totalAmount).toFixed(2)}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${deliveryStyles[order.deliveryStatus] || deliveryStyles.PENDING}`}>
                  Delivery: {order.deliveryStatus}
                </span>
              </div>

              <div className="mb-5 overflow-hidden rounded-2xl border border-stone-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead className="bg-stone-50">
                      <tr className="border-b border-stone-200">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Material</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Ordered</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Delivered</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {order.items.map((item) => {
                        const delivered = Number(deliveredByMaterial[item.materialName] || 0);
                        const remaining = Math.max(Number(item.quantity) - delivered, 0);

                        return (
                          <tr key={`${order._id}-${item.materialName}`}>
                            <td className="px-5 py-4 font-medium text-stone-900">{item.materialName}</td>
                            <td className="px-5 py-4 text-sm text-stone-600">{item.quantity} {item.unit}</td>
                            <td className="px-5 py-4 text-sm text-stone-600">{delivered.toFixed(2)} {item.unit}</td>
                            <td className="px-5 py-4 text-sm text-stone-600">{remaining.toFixed(2)} {item.unit}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-stone-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-stone-50">
                      <tr className="border-b border-stone-200">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Trip</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Material</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Truck</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Quantity</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Timeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(order.deliveryTrips || []).length > 0 ? (
                        order.deliveryTrips.map((trip) => (
                          <tr key={trip._id}>
                            <td className="px-5 py-4 font-medium text-stone-900">Trip #{trip.tripNumber}</td>
                            <td className="px-5 py-4 text-sm text-stone-600">{trip.materialName}</td>
                            <td className="px-5 py-4 text-sm text-stone-600">
                              {trip.truck?.name} ({trip.truck?.plateNumber})
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-600">
                              {trip.deliveredQuantity} {trip.unit}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tripStatusStyles[trip.status] || tripStatusStyles.PENDING}`}>
                                {trip.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-600">
                              <div>
                                {trip.dispatchedAt && <p>Dispatched: {new Date(trip.dispatchedAt).toLocaleString()}</p>}
                                {trip.deliveredAt && <p>Delivered: {new Date(trip.deliveredAt).toLocaleString()}</p>}
                                {!trip.dispatchedAt && !trip.deliveredAt && <p>Awaiting dispatch</p>}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-5 py-10 text-center text-stone-500">
                            No delivery trips assigned yet for this order.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {deliveryOrders.length === 0 && (
          <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold text-stone-900">No delivery records found</h3>
            <p className="mt-2 text-stone-500">
              Delivery updates will appear here once approved orders are assigned to trips.
            </p>
            <Link
              to="/contractor/orders"
              className="mt-5 inline-flex rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Back to Orders
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryHistory;
