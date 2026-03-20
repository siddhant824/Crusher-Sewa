import { useEffect, useMemo, useState } from "react";
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

const DeliveryManagement = () => {
  const [orders, setOrders] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [tripForms, setTripForms] = useState({});
  const [editingTripId, setEditingTripId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("ALL");
  const [editTripForm, setEditTripForm] = useState({
    deliveredQuantity: "",
    truckId: "",
    note: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordersData, trucksData] = await Promise.all([getAllOrders(), getTrucks()]);
      const approvedOrders = (ordersData.orders || []).filter(
        (order) => order.orderStatus === "APPROVED"
      );

      setOrders(approvedOrders);
      setTrucks(trucksData.trucks || []);
      setSelectedOrderId((current) => current || approvedOrders[0]?._id || "");
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
          .filter((trip) => trip.status !== "DELIVERED" && trip.status !== "CANCELLED")
          .map((trip) => String(trip.truck?._id || trip.truck))
      )
    );

  const getTripForm = (orderId) => tripForms[orderId] || defaultTripForm;

  const getSelectedTruck = (orderId) =>
    trucks.find((truck) => truck._id === getTripForm(orderId).truckId) || null;

  const getAvailableTrucks = (orderId, selectedTruckId = null) => {
    const activeTruckIds = getActiveTruckIds();
    const effectiveSelectedTruckId = selectedTruckId || getTripForm(orderId).truckId;

    return trucks.filter(
      (truck) =>
        !activeTruckIds.has(String(truck._id)) ||
        String(truck._id) === String(effectiveSelectedTruckId)
    );
  };

  const filteredOrders = useMemo(() => {
    let nextOrders = [...orders];

    if (deliveryFilter !== "ALL") {
      nextOrders = nextOrders.filter((order) => order.deliveryStatus === deliveryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      nextOrders = nextOrders.filter((order) => {
        const contractorName = order.contractor?.name?.toLowerCase() || "";
        const contractorEmail = order.contractor?.email?.toLowerCase() || "";

        return contractorName.includes(query) || contractorEmail.includes(query);
      });
    }

    return nextOrders;
  }, [orders, deliveryFilter, searchQuery]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId("");
      return;
    }

    const selectedStillVisible = filteredOrders.some((order) => order._id === selectedOrderId);
    if (!selectedStillVisible) {
      setSelectedOrderId(filteredOrders[0]._id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder =
    filteredOrders.find((order) => order._id === selectedOrderId) || filteredOrders[0] || null;

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
      const assignedWithoutCurrent =
        getAllocatedMaterialQuantity(order, trip.material?._id || trip.material) -
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading deliveries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-stone-900">Delivery Management</h1>
        <p className="text-stone-500">
          Manage approved orders, assign truck trips, and track delivery progress from one clean workspace.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <p className="font-medium text-stone-600">No approved orders ready for delivery</p>
          <p className="mt-1 text-sm text-stone-400">
            Approve contractor orders first, then create truck trips here.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Search Orders
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by contractor name or email"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Delivery Status
                </label>
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PARTIALLY_DELIVERED">Partially Delivered</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-medium text-stone-600">No matching delivery orders found</p>
                <p className="mt-1 text-sm text-stone-400">Try adjusting the search or delivery filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-stone-50">
                    <tr className="border-b border-stone-200">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                        Contractor
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                        Materials
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                        Trips
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                        Delivery Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                        Approved At
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-stone-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order._id}
                        className={selectedOrder?._id === order._id ? "bg-teal-50/40" : "hover:bg-stone-50"}
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-stone-900">{order.contractor?.name || "Contractor"}</p>
                          <p className="mt-1 text-sm text-stone-500">{order.contractor?.email}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-stone-600">
                          {order.items.length} material{order.items.length === 1 ? "" : "s"}
                        </td>
                        <td className="px-5 py-4 text-sm text-stone-600">
                          {order.deliveryTrips?.length || 0} trip{order.deliveryTrips?.length === 1 ? "" : "s"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${orderStatusStyles[order.orderStatus] || orderStatusStyles.APPROVED}`}>
                              {order.orderStatus}
                            </span>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${deliveryStyles[order.deliveryStatus] || deliveryStyles.PENDING}`}>
                              {order.deliveryStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-stone-600">
                          {formatDateTime(order.approvedAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order._id)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                              selectedOrder?._id === order._id
                                ? "bg-stone-900 text-white"
                                : "border border-stone-300 text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            {selectedOrder?._id === order._id ? "Selected" : "Manage"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedOrder && (
            <div className="space-y-6 rounded-xl border border-stone-200 bg-white p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">
                    {selectedOrder.contractor?.name || "Contractor"}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">{selectedOrder.contractor?.email}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    Approved on {formatDateTime(selectedOrder.approvedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${orderStatusStyles[selectedOrder.orderStatus] || orderStatusStyles.APPROVED}`}>
                    {selectedOrder.orderStatus}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${deliveryStyles[selectedOrder.deliveryStatus] || deliveryStyles.PENDING}`}>
                    Delivery: {selectedOrder.deliveryStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-stone-900">Material Progress</h3>
                  <p className="text-sm text-stone-500">
                    {selectedOrder.items.length} material{selectedOrder.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-stone-50">
                      <tr className="border-b border-stone-200">
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                          Material
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                          Ordered
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                          Assigned
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                          Delivered
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                          Remaining
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                          Progress
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {selectedOrder.items.map((item) => {
                        const progress = getMaterialProgress(selectedOrder, item);

                        return (
                          <tr key={`${selectedOrder._id}-${getMaterialId(item)}`}>
                            <td className="px-5 py-4">
                              <p className="font-medium text-stone-900">{item.materialName}</p>
                              <p className="mt-1 text-xs text-stone-500">{item.unit}</p>
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-700">
                              {progress.ordered.toFixed(2)} {item.unit}
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-700">
                              {progress.assigned.toFixed(2)} {item.unit}
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-700">
                              {progress.delivered.toFixed(2)} {item.unit}
                            </td>
                            <td className="px-5 py-4 text-sm font-medium text-stone-900">
                              {progress.remaining.toFixed(2)} {item.unit}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-2 w-28 overflow-hidden rounded-full bg-stone-100">
                                  <div
                                    className="h-full rounded-full bg-teal-500"
                                    style={{ width: `${progress.progress}%` }}
                                  />
                                </div>
                                <span className="text-sm text-stone-600">
                                  {progress.progress.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-stone-900">Trip History</h3>
                  <p className="text-sm text-stone-500">
                    {selectedOrder.deliveryTrips?.length || 0} trip{selectedOrder.deliveryTrips?.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  {selectedOrder.deliveryTrips?.length > 0 ? (
                    <table className="w-full min-w-[1120px]">
                      <thead className="bg-stone-50">
                        <tr className="border-b border-stone-200">
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                            Trip
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                            Material
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                            Quantity
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                            Truck
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                            Status
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                            Dispatched
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                            Delivered
                          </th>
                          <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-stone-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedOrder.deliveryTrips.map((trip) => (
                          <tr key={trip._id}>
                            <td className="px-5 py-4 text-sm font-medium text-stone-900">
                              Trip #{trip.tripNumber}
                              <p className="mt-1 text-xs font-normal text-stone-500">
                                Assigned by {trip.assignedBy?.name || "-"}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-700">
                              {trip.materialName}
                              {trip.note ? (
                                <p className="mt-1 text-xs text-stone-500">{trip.note}</p>
                              ) : null}
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-700">
                              {Number(trip.deliveredQuantity).toFixed(2)} {trip.unit}
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-700">
                              {trip.truck?.name || "-"}
                              <p className="mt-1 text-xs text-stone-500">{trip.truck?.plateNumber || "-"}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tripStatusStyles[trip.status] || tripStatusStyles.PENDING}`}>
                                {trip.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-600">
                              {formatDateTime(trip.dispatchedAt)}
                            </td>
                            <td className="px-5 py-4 text-sm text-stone-600">
                              {formatDateTime(trip.deliveredAt)}
                            </td>
                            <td className="px-5 py-4">
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
                        Use the trip form below to assign the first delivery round.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {editingTripId && selectedOrder.deliveryTrips?.some((trip) => trip._id === editingTripId) ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
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
                        selectedOrder._id,
                        selectedOrder.deliveryTrips.find((trip) => trip._id === editingTripId)?.truck?._id ||
                          selectedOrder.deliveryTrips.find((trip) => trip._id === editingTripId)?.truck
                      ).map((truck) => (
                        <option key={truck._id} value={truck._id}>
                          {truck.name} ({truck.plateNumber})
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
                    <p>
                      Truck capacity: {trucks.find((truck) => truck._id === editTripForm.truckId)?.capacity || 0}
                    </p>
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
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={actingId === editingTripId}
                        onClick={() =>
                          handleSaveTripEdit(
                            selectedOrder.deliveryTrips.find((trip) => trip._id === editingTripId)
                          )
                        }
                        className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {isOrderFullyAssigned(selectedOrder) ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                  <p className="font-medium text-teal-800">
                    All material quantities are already assigned to trips.
                  </p>
                  <p className="mt-1 text-sm text-teal-700">
                    Cancel or edit an existing trip if you need to reassign this order.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-base font-semibold text-stone-900">Create New Trip</h4>
                    <p className="text-sm text-stone-500">
                      Assign one truck and one material per trip. Remaining values update automatically as trips are added.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-5">
                    <select
                      value={getTripForm(selectedOrder._id).materialId}
                      onChange={(e) =>
                        handleTripFormChange(selectedOrder._id, "materialId", e.target.value)
                      }
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                    >
                      <option value="">Select material</option>
                      {selectedOrder.items.map((item) => {
                        const remaining = getMaterialProgress(selectedOrder, item).remaining;

                        return (
                          <option
                            key={`${selectedOrder._id}-${getMaterialId(item)}`}
                            value={getMaterialId(item)}
                            disabled={remaining <= 0}
                          >
                            {item.materialName} ({remaining.toFixed(2)} {item.unit} remaining)
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={getTripForm(selectedOrder._id).deliveredQuantity}
                      onChange={(e) =>
                        handleTripFormChange(selectedOrder._id, "deliveredQuantity", e.target.value)
                      }
                      placeholder="Quantity"
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                    />
                    <select
                      value={getTripForm(selectedOrder._id).truckId}
                      onChange={(e) =>
                        handleTripFormChange(selectedOrder._id, "truckId", e.target.value)
                      }
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                    >
                      <option value="">Select truck</option>
                      {getAvailableTrucks(selectedOrder._id).map((truck) => (
                        <option key={truck._id} value={truck._id}>
                          {truck.name} ({truck.plateNumber})
                        </option>
                      ))}
                    </select>
                    <select
                      value={getTripForm(selectedOrder._id).status}
                      onChange={(e) =>
                        handleTripFormChange(selectedOrder._id, "status", e.target.value)
                      }
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                    <button
                      type="button"
                      disabled={actingId === selectedOrder._id}
                      onClick={() => handleCreateTrip(selectedOrder._id)}
                      className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                    >
                      Add Trip
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <input
                      type="text"
                      value={getTripForm(selectedOrder._id).note}
                      onChange={(e) => handleTripFormChange(selectedOrder._id, "note", e.target.value)}
                      placeholder="Trip note"
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                    />
                    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
                      Truck capacity: {getSelectedTruck(selectedOrder._id)?.capacity || 0}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-1 text-xs text-stone-500">
                    {getTripForm(selectedOrder._id).materialId ? (
                      <p>
                        Remaining for selected material: {(
                          getMaterialProgress(
                            selectedOrder,
                            selectedOrder.items.find(
                              (item) =>
                                getMaterialId(item) ===
                                String(getTripForm(selectedOrder._id).materialId)
                            ) || selectedOrder.items[0]
                          ).remaining
                        ).toFixed(2)}
                      </p>
                    ) : null}
                    {getAvailableTrucks(selectedOrder._id).length === 0 ? (
                      <p className="text-amber-700">
                        No trucks are currently available. Complete or cancel an active trip first.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeliveryManagement;
