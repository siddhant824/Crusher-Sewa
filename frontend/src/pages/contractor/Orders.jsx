import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createOrder, getMyOrders } from "../../services/ordersApi.js";
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

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [draftItems, setDraftItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDraft, setConfirmingDraft] = useState(false);

  useEffect(() => {
    fetchOrders();
    setDraftItems(getDraftOrder());
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getMyOrders();
      setOrders(data.orders || []);
    } catch (err) {
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">My Orders</h1>
        <p className="text-stone-500 mt-1">
          Track your orders and delivery status
        </p>
      </div>

      {draftItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
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
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-amber-100 rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-stone-900">{item.name}</p>
                  <p className="text-sm text-stone-500">
                    {item.quantity} {item.unit} x Rs. {Number(item.ratePerCuMetre).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeDraftQuantity(item.materialId, -1)}
                      className="w-9 h-9 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleDraftQuantityChange(item.materialId, e.target.value)}
                      className="w-24 px-3 py-2 text-sm border border-stone-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => changeDraftQuantity(item.materialId, 1)}
                      className="w-9 h-9 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
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
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white border border-stone-200 rounded-xl p-5">
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
                    className="flex items-center justify-between gap-4 border border-stone-100 rounded-lg p-3"
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

              {order.deliveryTrips?.length > 0 && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <h3 className="font-medium text-stone-900 mb-3">Delivery Trips</h3>
                  <div className="space-y-3">
                    {order.deliveryTrips.map((trip) => (
                      <div
                        key={trip._id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-stone-100 rounded-lg p-3"
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
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Order Status Guide</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { status: "Pending", color: "bg-amber-500", desc: "Order received, awaiting confirmation" },
            { status: "Confirmed", color: "bg-sky-500", desc: "Order confirmed, preparing for dispatch" },
            { status: "In Transit", color: "bg-violet-500", desc: "Materials on the way to your site" },
            { status: "Delivered", color: "bg-teal-500", desc: "Order delivered successfully" },
          ].map((item) => (
            <div key={item.status} className="bg-white border border-stone-200 rounded-xl p-4">
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
