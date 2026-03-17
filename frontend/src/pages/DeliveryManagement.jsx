import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createDeliveryTrip, getAllOrders, updateDeliveryTrip } from "../services/ordersApi.js";
import { createTruck, getTrucks } from "../services/truckApi.js";

const orderStatusStyles = {
  APPROVED: "bg-teal-50 text-teal-700 border-teal-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

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

const defaultTripForm = {
  materialId: "",
  deliveredQuantity: "",
  truckId: "",
  status: "PENDING",
  note: "",
};

const DeliveryManagement = () => {
  const [orders, setOrders] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [tripForms, setTripForms] = useState({});
  const [editingTripId, setEditingTripId] = useState(null);
  const [editTripForm, setEditTripForm] = useState({
    deliveredQuantity: "",
    truckId: "",
    note: "",
  });
  const [truckSubmitting, setTruckSubmitting] = useState(false);
  const [truckForm, setTruckForm] = useState({
    name: "",
    plateNumber: "",
    capacity: "",
    note: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordersData, trucksData] = await Promise.all([getAllOrders(), getTrucks()]);
      const data = ordersData;
      const approvedOrders = (data.orders || []).filter(
        (order) => order.orderStatus === "APPROVED"
      );
      setOrders(approvedOrders);
      setTrucks(trucksData.trucks || []);
    } catch (err) {
      toast.error(err.message || "Failed to load delivery data");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderInState = (nextOrder) => {
    setOrders((current) =>
      current.map((order) => (order._id === nextOrder._id ? nextOrder : order))
    );
  };

  const getMaterialId = (item) => String(item.material?._id || item.material);

  const getAllocatedMaterialQuantity = (order, materialId) =>
    (order.deliveryTrips || [])
      .filter(
        (trip) =>
          String(trip.material?._id || trip.material) === String(materialId) &&
          trip.status !== "CANCELLED"
      )
      .reduce((sum, trip) => sum + Number(trip.deliveredQuantity), 0);

  const getDeliveredMaterialQuantity = (order, materialId) =>
    (order.deliveryTrips || [])
      .filter(
        (trip) =>
          String(trip.material?._id || trip.material) === String(materialId) &&
          trip.status === "DELIVERED"
      )
      .reduce((sum, trip) => sum + Number(trip.deliveredQuantity), 0);

  const getMaterialProgress = (order, item) => {
    const materialId = getMaterialId(item);
    const ordered = Number(item.quantity);
    const assigned = getAllocatedMaterialQuantity(order, materialId);
    const delivered = getDeliveredMaterialQuantity(order, materialId);
    const remaining = Math.max(ordered - assigned, 0);
    const progress = ordered > 0 ? Math.min((delivered / ordered) * 100, 100) : 0;

    return {
      ordered,
      assigned,
      delivered,
      remaining,
      progress,
    };
  };

  const isOrderFullyAssigned = (order) =>
    order.items.every((item) => getMaterialProgress(order, item).remaining <= 0);

  const getActiveTruckIds = () =>
    new Set(
      orders.flatMap((order) =>
        (order.deliveryTrips || [])
          .filter((trip) => trip.status !== "DELIVERED")
          .map((trip) => String(trip.truck?._id || trip.truck))
      )
    );

  const getSelectedTruck = (orderId) =>
    trucks.find((truck) => truck._id === getTripForm(orderId).truckId) || null;

  const getAvailableTrucks = (orderId, selectedTruckId = null) => {
    const activeTruckIds = getActiveTruckIds();
    const effectiveSelectedTruckId = selectedTruckId || getTripForm(orderId).truckId;

    return trucks.filter(
      (truck) =>
        !activeTruckIds.has(String(truck._id)) || String(truck._id) === String(effectiveSelectedTruckId)
    );
  };

  const getBusyTruckTrips = () =>
    orders.flatMap((order) =>
      (order.deliveryTrips || [])
        .filter((trip) => trip.status !== "DELIVERED" && trip.status !== "CANCELLED")
        .map((trip) => ({
          orderId: order._id,
          contractorName: order.contractor?.name || "Contractor",
          trip,
        }))
    );

  const getTripForm = (orderId) => tripForms[orderId] || defaultTripForm;

  const handleTripFormChange = (orderId, field, value) => {
    setTripForms((current) => ({
      ...current,
      [orderId]: {
        ...getTripForm(orderId),
        [field]: value,
      },
    }));
  };

  const handleCreateTrip = async (orderId) => {
    const form = getTripForm(orderId);
    const selectedTruck = getSelectedTruck(orderId);
    const order = orders.find((item) => item._id === orderId);
    const selectedItem = order?.items.find(
      (item) => getMaterialId(item) === String(form.materialId)
    );
    setActingId(orderId);

    if (!form.materialId || !form.truckId || !form.deliveredQuantity) {
      toast.error("Select a material, truck, and quantity first");
      setActingId(null);
      return;
    }

    if (!order || !selectedItem) {
      toast.error("Selected material was not found in this order");
      setActingId(null);
      return;
    }

    if (isOrderFullyAssigned(order)) {
      toast.error("All quantities are already assigned for this order");
      setActingId(null);
      return;
    }

    const requestedQuantity = Number(form.deliveredQuantity);
    const remainingQuantity = getMaterialProgress(order, selectedItem).remaining;

    if (requestedQuantity > remainingQuantity) {
      toast.error(`Only ${remainingQuantity.toFixed(2)} ${selectedItem.unit} is remaining to assign`);
      setActingId(null);
      return;
    }

    if (selectedTruck && selectedTruck.capacity > 0 && requestedQuantity > selectedTruck.capacity) {
      toast.error(`Trip quantity exceeds truck capacity of ${selectedTruck.capacity}`);
      setActingId(null);
      return;
    }

    try {
      const data = await createDeliveryTrip({
        orderId,
        materialId: form.materialId,
        deliveredQuantity: Number(form.deliveredQuantity),
        truckId: form.truckId,
        status: form.status,
        note: form.note,
      });
      toast.success(data.message || "Delivery trip created");
      updateOrderInState(data.order);
      setTripForms((current) => ({
        ...current,
        [orderId]: defaultTripForm,
      }));
    } catch (err) {
      toast.error(err.message || "Failed to create delivery trip");
    } finally {
      setActingId(null);
    }
  };

  const handleTripStatusUpdate = async (tripId, nextStatus) => {
    setActingId(tripId);
    try {
      const data = await updateDeliveryTrip(tripId, { status: nextStatus });
      toast.success(data.message || "Delivery trip updated");
      updateOrderInState(data.order);
    } catch (err) {
      toast.error(err.message || "Failed to update delivery trip");
    } finally {
      setActingId(null);
    }
  };

  const startEditingTrip = (trip) => {
    setEditingTripId(trip._id);
    setEditTripForm({
      deliveredQuantity: String(trip.deliveredQuantity),
      truckId: trip.truck?._id || trip.truck || "",
      note: trip.note || "",
    });
  };

  const handleSaveTripEdit = async (trip) => {
    setActingId(trip._id);
    const selectedTruck = trucks.find((truck) => truck._id === editTripForm.truckId);
    const order = orders.find((item) => item._id === trip.order);
    const orderItem = order?.items.find(
      (item) => getMaterialId(item) === String(trip.material?._id || trip.material)
    );
    const requestedQuantity = Number(editTripForm.deliveredQuantity);

    if (
      selectedTruck &&
      selectedTruck.capacity > 0 &&
      requestedQuantity > selectedTruck.capacity
    ) {
      toast.error(`Trip quantity exceeds truck capacity of ${selectedTruck.capacity}`);
      setActingId(null);
      return;
    }

    if (order && orderItem) {
      const assignedWithoutCurrent = getAllocatedMaterialQuantity(
        order,
        trip.material?._id || trip.material
      ) - Number(trip.deliveredQuantity);
      const maxAllowed = Number(orderItem.quantity) - assignedWithoutCurrent;

      if (requestedQuantity > maxAllowed) {
        toast.error(`Only ${maxAllowed.toFixed(2)} ${orderItem.unit} can be assigned for this material`);
        setActingId(null);
        return;
      }
    }

    try {
      const data = await updateDeliveryTrip(trip._id, {
        deliveredQuantity: Number(editTripForm.deliveredQuantity),
        truckId: editTripForm.truckId,
        note: editTripForm.note,
      });
      toast.success(data.message || "Trip updated successfully");
      updateOrderInState(data.order);
      setEditingTripId(null);
    } catch (err) {
      toast.error(err.message || "Failed to update trip");
    } finally {
      setActingId(null);
    }
  };

  const handleCancelTrip = async (tripId) => {
    setActingId(tripId);
    try {
      const data = await updateDeliveryTrip(tripId, { status: "CANCELLED" });
      toast.success("Trip cancelled successfully");
      updateOrderInState(data.order);
      if (editingTripId === tripId) {
        setEditingTripId(null);
      }
    } catch (err) {
      toast.error(err.message || "Failed to cancel trip");
    } finally {
      setActingId(null);
    }
  };

  const handleCreateTruck = async (e) => {
    e.preventDefault();
    setTruckSubmitting(true);
    try {
      const data = await createTruck({
        ...truckForm,
        capacity: Number(truckForm.capacity || 0),
      });
      toast.success(data.message || "Truck created");
      setTrucks((current) => [data.truck, ...current]);
      setTruckForm({
        name: "",
        plateNumber: "",
        capacity: "",
        note: "",
      });
    } catch (err) {
      toast.error(err.message || "Failed to create truck");
    } finally {
      setTruckSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading deliveries...</p>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Delivery Management</h1>
        <p className="text-stone-500 mt-1">
          Manage truck trips for approved orders and track partial or full delivery progress.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6 overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-stone-900">Truck Master</h2>
            <p className="text-sm text-stone-500 mt-1">
              Add all trucks that can be assigned to delivery rounds and repeated trips.
            </p>
            <form onSubmit={handleCreateTruck} className="space-y-3 mt-4">
              <input
                type="text"
                value={truckForm.name}
                onChange={(e) => setTruckForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Truck name"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                required
              />
              <input
                type="text"
                value={truckForm.plateNumber}
                onChange={(e) => setTruckForm((current) => ({ ...current, plateNumber: e.target.value }))}
                placeholder="Plate number"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                required
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={truckForm.capacity}
                onChange={(e) => setTruckForm((current) => ({ ...current, capacity: e.target.value }))}
                placeholder="Capacity"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
              <input
                type="text"
                value={truckForm.note}
                onChange={(e) => setTruckForm((current) => ({ ...current, note: e.target.value }))}
                placeholder="Optional note"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={truckSubmitting}
                className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {truckSubmitting ? "Saving..." : "Add Truck"}
              </button>
            </form>
          </div>

          <div className="min-w-0">
            <h3 className="font-medium text-stone-900 mb-3">Available Trucks</h3>
            {trucks.length === 0 ? (
              <p className="text-sm text-stone-400">No trucks added yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {trucks.map((truck) => {
                  const busyTripInfo = getBusyTruckTrips().find(
                    ({ trip }) => String(trip.truck?._id || trip.truck) === String(truck._id)
                  );

                  return (
                    <div key={truck._id} className="border border-stone-100 rounded-lg p-4 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-stone-900 break-words">{truck.name}</p>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                            busyTripInfo ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700"
                          }`}
                        >
                          {busyTripInfo ? "Busy" : "Available"}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 mt-1 break-words">{truck.plateNumber}</p>
                      <p className="text-sm text-stone-500 mt-1">
                        Capacity: {truck.capacity || 0}
                      </p>
                      {busyTripInfo && (
                        <p className="text-sm text-amber-700 mt-2 break-words">
                          {truck.name} is on Trip #{busyTripInfo.trip.tripNumber} for {busyTripInfo.contractorName}
                        </p>
                      )}
                      {truck.note && <p className="text-sm text-stone-600 mt-2 break-words">{truck.note}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6 overflow-hidden">
        <h2 className="text-lg font-semibold text-stone-900">Busy Trucks</h2>
        <p className="text-sm text-stone-500 mt-1">
          Trucks below are already assigned to active trips and will reappear after those trips are delivered or cancelled.
        </p>
        <div className="mt-4 space-y-3">
          {getBusyTruckTrips().length === 0 ? (
            <p className="text-sm text-stone-400">No trucks are currently busy.</p>
          ) : (
            getBusyTruckTrips().map(({ trip, contractorName }) => (
              <div key={trip._id} className="border border-stone-100 rounded-lg p-4 min-w-0">
                <p className="font-medium text-stone-900">
                  {trip.truck?.name} ({trip.truck?.plateNumber})
                </p>
                <p className="text-sm text-stone-500 mt-1 break-words">
                  Busy on Trip #{trip.tripNumber} for {contractorName}
                </p>
                <p className="text-sm text-stone-500 mt-1 break-words">
                  Material: {trip.materialName}, Status: {trip.status}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <p className="text-stone-600 font-medium">No approved orders ready for delivery</p>
          <p className="text-sm text-stone-400 mt-1">
            Approve contractor orders first, then create truck trips here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div key={order._id} className="bg-white border border-stone-200 rounded-xl p-5 overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    {order.contractor?.name || "Contractor"}
                  </h2>
                  <p className="text-sm text-stone-500">{order.contractor?.email}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Approved on {order.approvedAt ? new Date(order.approvedAt).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${orderStatusStyles[order.orderStatus] || orderStatusStyles.APPROVED}`}>
                    {order.orderStatus}
                  </span>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${deliveryStyles[order.deliveryStatus] || deliveryStyles.PENDING}`}>
                    Delivery: {order.deliveryStatus}
                  </span>
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-100 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-stone-900 mb-2">Ordered Materials</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {order.items.map((item) => {
                    const progress = getMaterialProgress(order, item);

                    return (
                      <div key={`${order._id}-${item.materialName}`} className="border border-stone-200 rounded-lg bg-white p-4 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-stone-800 break-words">{item.materialName}</p>
                            <p className="text-xs text-stone-500 mt-1">Material-wise delivery progress</p>
                          </div>
                          <span className="text-xs font-medium text-stone-500 shrink-0">
                            {progress.progress.toFixed(0)}% delivered
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full mt-3 overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                          <div>
                            <p className="text-stone-400">Ordered</p>
                            <p className="font-medium text-stone-800">{progress.ordered} {item.unit}</p>
                          </div>
                          <div>
                            <p className="text-stone-400">Assigned</p>
                            <p className="font-medium text-stone-800">{progress.assigned} {item.unit}</p>
                          </div>
                          <div>
                            <p className="text-stone-400">Delivered</p>
                            <p className="font-medium text-stone-800">{progress.delivered} {item.unit}</p>
                          </div>
                          <div>
                            <p className="text-stone-400">Remaining</p>
                            <p className="font-medium text-stone-800">{progress.remaining.toFixed(2)} {item.unit}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="font-medium text-stone-900">Truck Trips</h3>
                  <p className="text-sm text-stone-500">
                    {order.deliveryTrips?.length || 0} trip{order.deliveryTrips?.length === 1 ? "" : "s"}
                  </p>
                </div>

                {order.deliveryTrips?.length > 0 ? (
                  <div className="space-y-3">
                    {order.deliveryTrips.map((trip) => (
                      <div
                        key={trip._id}
                        className="border border-stone-100 rounded-lg p-4 flex flex-col gap-4 min-w-0"
                      >
                        {editingTripId === trip._id ? (
                          <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editTripForm.deliveredQuantity}
                              onChange={(e) => setEditTripForm((current) => ({ ...current, deliveredQuantity: e.target.value }))}
                              className="px-3 py-2 text-sm border border-stone-300 rounded-lg"
                            />
                            <select
                              value={editTripForm.truckId}
                              onChange={(e) => setEditTripForm((current) => ({ ...current, truckId: e.target.value }))}
                              className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                            >
                              <option value="">Select truck</option>
                              {getAvailableTrucks(order._id, trip.truck?._id || trip.truck).map((truck) => (
                                <option key={truck._id} value={truck._id}>
                                  {truck.name} ({truck.plateNumber})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editTripForm.note}
                              onChange={(e) => setEditTripForm((current) => ({ ...current, note: e.target.value }))}
                              placeholder="Trip note"
                              className="px-3 py-2 text-sm border border-stone-300 rounded-lg"
                            />
                            <p className="md:col-span-2 xl:col-span-3 text-xs text-stone-500">
                              Truck capacity: {trucks.find((truck) => truck._id === editTripForm.truckId)?.capacity || 0}
                            </p>
                            <div className="flex gap-2 md:col-span-2 xl:col-span-3">
                              <button
                                type="button"
                                disabled={actingId === trip._id}
                                onClick={() => handleSaveTripEdit(trip)}
                                className="px-3 py-2 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTripId(null)}
                                className="px-3 py-2 text-xs border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 min-w-0">
                            <div className="min-w-0">
                              <p className="font-medium text-stone-900 break-words">Trip #{trip.tripNumber}</p>
                              <p className="text-sm text-stone-500 break-words">
                                {trip.materialName}: {trip.deliveredQuantity} {trip.unit} on {trip.truck?.name} ({trip.truck?.plateNumber})
                              </p>
                              <p className="text-sm text-stone-500 break-words">
                                Assigned by {trip.assignedBy?.name}
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
                                <p className="text-sm text-stone-600 mt-1 break-words">{trip.note}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${tripStatusStyles[trip.status] || tripStatusStyles.PENDING}`}>
                                {trip.status}
                              </span>
                              <button
                                type="button"
                                disabled={actingId === trip._id || trip.status === "IN_TRANSIT" || trip.status === "DELIVERED" || trip.status === "CANCELLED"}
                                onClick={() => handleTripStatusUpdate(trip._id, "IN_TRANSIT")}
                                className="px-3 py-1.5 text-xs bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 disabled:opacity-50"
                              >
                                Dispatch
                              </button>
                              <button
                                type="button"
                                disabled={actingId === trip._id || trip.status === "DELIVERED" || trip.status === "CANCELLED"}
                                onClick={() => handleTripStatusUpdate(trip._id, "DELIVERED")}
                                className="px-3 py-1.5 text-xs bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 disabled:opacity-50"
                              >
                                Mark Delivered
                              </button>
                              <button
                                type="button"
                                disabled={trip.status === "DELIVERED" || trip.status === "CANCELLED"}
                                onClick={() => startEditingTrip(trip)}
                                className="px-3 py-1.5 text-xs bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={trip.status === "DELIVERED" || trip.status === "CANCELLED"}
                                onClick={() => handleCancelTrip(trip._id)}
                                className="px-3 py-1.5 text-xs bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 disabled:opacity-50"
                              >
                                Cancel Trip
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400">No delivery trips created yet.</p>
                )}
              </div>

              {order.items.every(
                (item) => getMaterialProgress(order, item).remaining <= 0
              ) ? (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="font-medium text-teal-800">All material quantities are already assigned to trips.</p>
                  <p className="text-sm text-teal-700 mt-1">
                    Add more trips only after cancelling an assigned trip or when a future workflow requires reassignment.
                  </p>
                </div>
              ) : (
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 overflow-hidden">
                  <h4 className="font-medium text-stone-900 mb-3">Create New Truck Trip</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <select
                      value={getTripForm(order._id).materialId}
                      onChange={(e) => handleTripFormChange(order._id, "materialId", e.target.value)}
                      className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                    >
                      <option value="">Select material</option>
                      {order.items.map((item) => {
                        const remaining = getMaterialProgress(order, item).remaining;

                        return (
                          <option
                            key={`${order._id}-${item.materialName}`}
                            value={getMaterialId(item)}
                            disabled={remaining <= 0}
                          >
                            {item.materialName} ({remaining.toFixed(2)} {item.unit} remaining)
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={getSelectedTruck(order._id)?.capacity > 0 ? getSelectedTruck(order._id).capacity : undefined}
                      value={getTripForm(order._id).deliveredQuantity}
                      onChange={(e) => handleTripFormChange(order._id, "deliveredQuantity", e.target.value)}
                      placeholder="Delivered qty"
                      className="px-3 py-2 text-sm border border-stone-300 rounded-lg"
                    />
                    <select
                      value={getTripForm(order._id).truckId}
                      onChange={(e) => handleTripFormChange(order._id, "truckId", e.target.value)}
                      className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                    >
                      <option value="">Select truck</option>
                      {getAvailableTrucks(order._id).map((truck) => (
                        <option key={truck._id} value={truck._id}>
                          {truck.name} ({truck.plateNumber})
                        </option>
                      ))}
                    </select>
                    <select
                      value={getTripForm(order._id).status}
                      onChange={(e) => handleTripFormChange(order._id, "status", e.target.value)}
                      className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                    <input
                      type="text"
                      value={getTripForm(order._id).note}
                      onChange={(e) => handleTripFormChange(order._id, "note", e.target.value)}
                      placeholder="Truck / trip note"
                      className="px-3 py-2 text-sm border border-stone-300 rounded-lg md:col-span-2"
                    />
                    <button
                      type="button"
                      disabled={actingId === order._id}
                      onClick={() => handleCreateTrip(order._id)}
                      className="px-4 py-2 text-sm bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
                    >
                      Add Trip
                    </button>
                  </div>
                  {getSelectedTruck(order._id) && (
                    <p className="text-xs text-stone-500 mt-3">
                      Selected truck capacity: {getSelectedTruck(order._id).capacity || 0}
                    </p>
                  )}
                  {getTripForm(order._id).materialId && (
                    <p className="text-xs text-stone-500 mt-1">
                      Remaining for selected material: {(
                        getMaterialProgress(
                          order,
                          order.items.find(
                            (item) => getMaterialId(item) === String(getTripForm(order._id).materialId)
                          ) || order.items[0]
                        ).remaining
                      ).toFixed(2)}
                    </p>
                  )}
                  {getAvailableTrucks(order._id).length === 0 && (
                    <p className="text-xs text-amber-700 mt-2">
                      No trucks are currently available. Check the Busy Trucks section above.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
