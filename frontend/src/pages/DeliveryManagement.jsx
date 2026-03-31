import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { createDeliveryTrip, getAllOrders, updateDeliveryTrip } from "../services/ordersApi.js";
import { getTrucks } from "../services/truckApi.js";

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

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

const formatTruckOptionLabel = (truck) => {
  const numericCapacity = Number(truck.capacity);
  const capacityLabel =
    Number.isFinite(numericCapacity) && numericCapacity > 0
      ? ` - Capacity: ${numericCapacity}`
      : "";

  return `${truck.name} (${truck.plateNumber})${capacityLabel}`;
};

const getMaterialId = (item) => String(item.material?._id || item.material);

const DeliveryManagement = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/manager";

  const [order, setOrder] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [tripForm, setTripForm] = useState(defaultTripForm);
  const [editingTripId, setEditingTripId] = useState(null);
  const [editTripForm, setEditTripForm] = useState({
    deliveredQuantity: "",
    truckId: "",
    note: "",
  });

  const fetchDeliveryData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, trucksData] = await Promise.all([getAllOrders(), getTrucks()]);
      const approvedOrder = (ordersData.orders || []).find(
        (item) => item._id === orderId && item.orderStatus === "APPROVED"
      );

      if (!approvedOrder) {
        setOrder(null);
      } else {
        setOrder(approvedOrder);
      }

      setTrucks(trucksData.trucks || []);
    } catch (err) {
      toast.error(err.message || "Failed to load delivery data");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchDeliveryData();
  }, [fetchDeliveryData]);

  const getAllocatedMaterialQuantity = (materialId) =>
    (order?.deliveryTrips || [])
      .filter(
        (trip) =>
          String(trip.material?._id || trip.material) === String(materialId) &&
          trip.status !== "CANCELLED"
      )
      .reduce((sum, trip) => sum + Number(trip.deliveredQuantity), 0);

  const getDeliveredMaterialQuantity = (materialId) =>
    (order?.deliveryTrips || [])
      .filter(
        (trip) =>
          String(trip.material?._id || trip.material) === String(materialId) &&
          trip.status === "DELIVERED"
      )
      .reduce((sum, trip) => sum + Number(trip.deliveredQuantity), 0);

  const getMaterialProgress = (item) => {
    const materialId = getMaterialId(item);
    const ordered = Number(item.quantity);
    const assigned = getAllocatedMaterialQuantity(materialId);
    const delivered = getDeliveredMaterialQuantity(materialId);
    const remaining = Math.max(ordered - assigned, 0);
    const progress = ordered > 0 ? Math.min((delivered / ordered) * 100, 100) : 0;

    return { ordered, assigned, delivered, remaining, progress };
  };

  const isOrderFullyAssigned = order
    ? order.items.every((item) => getMaterialProgress(item).remaining <= 0)
    : false;

  const activeTruckIds = useMemo(
    () =>
      new Set(
        (order?.deliveryTrips || [])
          .filter((trip) => trip.status !== "DELIVERED" && trip.status !== "CANCELLED")
          .map((trip) => String(trip.truck?._id || trip.truck))
      ),
    [order]
  );

  const getAvailableTrucks = (selectedTruckId = null) =>
    trucks.filter(
      (truck) =>
        !activeTruckIds.has(String(truck._id)) || String(truck._id) === String(selectedTruckId)
    );

  const selectedTruck = trucks.find((truck) => truck._id === tripForm.truckId) || null;

  const updateOrderState = (nextOrder) => {
    setOrder(nextOrder);
  };

  const handleCreateTrip = async () => {
    if (!order) return;

    const selectedItem = order.items.find(
      (item) => getMaterialId(item) === String(tripForm.materialId)
    );

    setActingId(order._id);

    if (!tripForm.materialId || !tripForm.truckId || !tripForm.deliveredQuantity) {
      toast.error("Select a material, truck, and quantity first");
      setActingId(null);
      return;
    }

    if (!selectedItem) {
      toast.error("Selected material was not found in this order");
      setActingId(null);
      return;
    }

    if (isOrderFullyAssigned) {
      toast.error("All quantities are already assigned for this order");
      setActingId(null);
      return;
    }

    const requestedQuantity = Number(tripForm.deliveredQuantity);
    const remainingQuantity = getMaterialProgress(selectedItem).remaining;

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
        orderId: order._id,
        materialId: tripForm.materialId,
        deliveredQuantity: requestedQuantity,
        truckId: tripForm.truckId,
        status: tripForm.status,
        note: tripForm.note,
      });

      toast.success(data.message || "Delivery trip created");
      updateOrderState(data.order);
      setTripForm(defaultTripForm);
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
      updateOrderState(data.order);
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
    if (!order) return;

    setActingId(trip._id);

    const selectedTruckForEdit = trucks.find((truck) => truck._id === editTripForm.truckId);
    const orderItem = order.items.find(
      (item) => getMaterialId(item) === String(trip.material?._id || trip.material)
    );
    const requestedQuantity = Number(editTripForm.deliveredQuantity);

    if (
      selectedTruckForEdit &&
      selectedTruckForEdit.capacity > 0 &&
      requestedQuantity > selectedTruckForEdit.capacity
    ) {
      toast.error(`Trip quantity exceeds truck capacity of ${selectedTruckForEdit.capacity}`);
      setActingId(null);
      return;
    }

    if (orderItem) {
      const assignedWithoutCurrent =
        getAllocatedMaterialQuantity(trip.material?._id || trip.material) -
        Number(trip.deliveredQuantity);
      const maxAllowed = Number(orderItem.quantity) - assignedWithoutCurrent;

      if (requestedQuantity > maxAllowed) {
        toast.error(`Only ${maxAllowed.toFixed(2)} ${orderItem.unit} can be assigned for this material`);
        setActingId(null);
        return;
      }
    }

    try {
      const data = await updateDeliveryTrip(trip._id, {
        deliveredQuantity: requestedQuantity,
        truckId: editTripForm.truckId,
        note: editTripForm.note,
      });

      toast.success(data.message || "Trip updated successfully");
      updateOrderState(data.order);
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
      updateOrderState(data.order);
      if (editingTripId === tripId) {
        setEditingTripId(null);
      }
    } catch (err) {
      toast.error(err.message || "Failed to cancel trip");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading delivery workspace...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
        <p className="font-medium text-stone-600">This order is not ready for delivery</p>
        <p className="mt-1 text-sm text-stone-400">
          Only approved orders can be opened in the delivery workspace.
        </p>
        <Link
          to={`${basePath}/orders`}
          className="mt-4 inline-flex rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            to={`${basePath}/orders`}
            className="text-sm font-medium text-stone-500 hover:text-stone-800"
          >
            Back to Orders
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">Order Delivery</h1>
          <p className="mt-1 text-stone-500">
            Assign trips and manage delivery for {order.contractor?.name || "this contractor"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${orderStatusStyles[order.orderStatus] || orderStatusStyles.APPROVED}`}>
            {order.orderStatus}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${deliveryStyles[order.deliveryStatus] || deliveryStyles.PENDING}`}>
            Delivery: {order.deliveryStatus}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">{order.contractor?.name}</h2>
            <p className="mt-1 text-sm text-stone-500">{order.contractor?.email}</p>
            <p className="mt-1 text-sm text-stone-500">
              Approved on {formatDateTime(order.approvedAt)}
            </p>
          </div>
          <p className="text-lg font-semibold text-stone-900">
            Order Total: Rs. {order.totalAmount.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[760px]">
          <thead className="bg-stone-50">
            <tr className="border-b border-stone-200">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Material</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Ordered</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Assigned</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Delivered</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Remaining</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {order.items.map((item) => {
              const progress = getMaterialProgress(item);

              return (
                <tr key={`${order._id}-${getMaterialId(item)}`}>
                  <td className="px-4 py-4 text-sm font-medium text-stone-900">{item.materialName}</td>
                  <td className="px-4 py-4 text-sm text-stone-700">{progress.ordered.toFixed(2)} {item.unit}</td>
                  <td className="px-4 py-4 text-sm text-stone-700">{progress.assigned.toFixed(2)} {item.unit}</td>
                  <td className="px-4 py-4 text-sm text-stone-700">{progress.delivered.toFixed(2)} {item.unit}</td>
                  <td className="px-4 py-4 text-sm font-medium text-stone-900">{progress.remaining.toFixed(2)} {item.unit}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${progress.progress}%` }} />
                      </div>
                      <span className="text-sm text-stone-600">{progress.progress.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        {(order.deliveryTrips || []).length > 0 ? (
          <table className="w-full min-w-[980px]">
            <thead className="bg-stone-50">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Trip</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Material</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Truck</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Dispatched</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">Delivered</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-stone-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {order.deliveryTrips.map((trip) => (
                <tr key={trip._id}>
                  <td className="px-4 py-4 text-sm font-medium text-stone-900">
                    Trip #{trip.tripNumber}
                    <p className="mt-1 text-xs font-normal text-stone-500">
                      Assigned by {trip.assignedBy?.name || "-"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-700">
                    {trip.materialName}
                    {trip.note ? <p className="mt-1 text-xs text-stone-500">{trip.note}</p> : null}
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-700">
                    {trip.truck?.name || "-"}
                    <p className="mt-1 text-xs text-stone-500">{trip.truck?.plateNumber || "-"}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-700">
                    {Number(trip.deliveredQuantity).toFixed(2)} {trip.unit}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tripStatusStyles[trip.status] || tripStatusStyles.PENDING}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-600">{formatDateTime(trip.dispatchedAt)}</td>
                  <td className="px-4 py-4 text-sm text-stone-600">{formatDateTime(trip.deliveredAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={
                          actingId === trip._id ||
                          trip.status === "IN_TRANSIT" ||
                          trip.status === "DELIVERED" ||
                          trip.status === "CANCELLED"
                        }
                        onClick={() => handleTripStatusUpdate(trip._id, "IN_TRANSIT")}
                        className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                      >
                        Dispatch
                      </button>
                      <button
                        type="button"
                        disabled={
                          actingId === trip._id ||
                          trip.status === "DELIVERED" ||
                          trip.status === "CANCELLED"
                        }
                        onClick={() => handleTripStatusUpdate(trip._id, "DELIVERED")}
                        className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                      >
                        Mark Delivered
                      </button>
                      <button
                        type="button"
                        disabled={trip.status === "DELIVERED" || trip.status === "CANCELLED"}
                        onClick={() => startEditingTrip(trip)}
                        className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={trip.status === "DELIVERED" || trip.status === "CANCELLED"}
                        onClick={() => handleCancelTrip(trip._id)}
                        className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center">
            <p className="font-medium text-stone-600">No delivery trips created yet</p>
            <p className="mt-1 text-sm text-stone-400">
              Start with the trip form below for this approved order.
            </p>
          </div>
        )}
      </div>

      {editingTripId && order.deliveryTrips?.some((trip) => trip._id === editingTripId) ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h4 className="text-base font-semibold text-stone-900">Edit Trip</h4>
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <input
              type="text"
              inputMode="decimal"
              value={editTripForm.deliveredQuantity}
              onChange={(e) =>
                setEditTripForm((current) => ({
                  ...current,
                  deliveredQuantity: e.target.value,
                }))
              }
              placeholder="Delivered quantity"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
            />
            <select
              value={editTripForm.truckId}
              onChange={(e) =>
                setEditTripForm((current) => ({ ...current, truckId: e.target.value }))
              }
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="">Select truck</option>
              {getAvailableTrucks(
                order.deliveryTrips.find((trip) => trip._id === editingTripId)?.truck?._id ||
                  order.deliveryTrips.find((trip) => trip._id === editingTripId)?.truck
              ).map((truck) => (
                <option key={truck._id} value={truck._id}>
                  {formatTruckOptionLabel(truck)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={editTripForm.note}
              onChange={(e) =>
                setEditTripForm((current) => ({ ...current, note: e.target.value }))
              }
              placeholder="Trip note"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 lg:col-span-2"
            />
          </div>
          <div className="mt-3 flex flex-col gap-3 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Truck capacity: {trucks.find((truck) => truck._id === editTripForm.truckId)?.capacity || 0}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingTripId(null);
                  setEditTripForm({
                    deliveredQuantity: "",
                    truckId: "",
                    note: "",
                  });
                }}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actingId === editingTripId}
                onClick={() =>
                  handleSaveTripEdit(order.deliveryTrips.find((trip) => trip._id === editingTripId))
                }
                className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isOrderFullyAssigned ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="font-medium text-teal-800">
            All material quantities are already assigned to trips.
          </p>
          <p className="mt-1 text-sm text-teal-700">
            Cancel or edit an existing trip if you need to reassign this order.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-semibold text-stone-900">Create New Trip</h4>
            <p className="text-sm text-stone-500">
              Choose one material, one truck, and the trip quantity for this order.
            </p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            <select
              value={tripForm.materialId}
              onChange={(e) => setTripForm((current) => ({ ...current, materialId: e.target.value }))}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="">Select material</option>
              {order.items.map((item) => {
                const remaining = getMaterialProgress(item).remaining;

                return (
                  <option
                    key={`${order._id}-${getMaterialId(item)}`}
                    value={getMaterialId(item)}
                    disabled={remaining <= 0}
                  >
                    {item.materialName} ({remaining.toFixed(2)} {item.unit} remaining)
                  </option>
                );
              })}
            </select>
            <select
              value={tripForm.truckId}
              onChange={(e) => setTripForm((current) => ({ ...current, truckId: e.target.value }))}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="">Select truck</option>
              {getAvailableTrucks().map((truck) => (
                <option key={truck._id} value={truck._id}>
                  {formatTruckOptionLabel(truck)}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={tripForm.deliveredQuantity}
              onChange={(e) =>
                setTripForm((current) => ({ ...current, deliveredQuantity: e.target.value }))
              }
              placeholder="Quantity"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
            />
            <select
              value={tripForm.status}
              onChange={(e) => setTripForm((current) => ({ ...current, status: e.target.value }))}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="PENDING">Pending</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
            </select>
            <button
              type="button"
              disabled={actingId === order._id}
              onClick={handleCreateTrip}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            >
              Add Trip
            </button>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <input
              type="text"
              value={tripForm.note}
              onChange={(e) => setTripForm((current) => ({ ...current, note: e.target.value }))}
              placeholder="Trip note"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
            />
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
              Truck capacity: {selectedTruck?.capacity || 0}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1 text-xs text-stone-500">
            {tripForm.materialId ? (
              <p>
                Remaining for selected material:{" "}
                {(
                  getMaterialProgress(
                    order.items.find((item) => getMaterialId(item) === String(tripForm.materialId))
                  ).remaining
                ).toFixed(2)}
              </p>
            ) : null}
            {getAvailableTrucks().length === 0 ? (
              <p className="text-amber-700">
                No trucks are currently available. Complete or cancel an active trip first.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
