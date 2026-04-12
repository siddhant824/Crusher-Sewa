import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getAllOrders } from "../services/ordersApi.js";
import { useAuth } from "../hooks/useAuth.js";
import { deleteTruck, getTrucks, updateTruck } from "../services/truckApi.js";
import ConfirmModal from "../components/ConfirmModal.jsx";

const TRUCKS_PER_PAGE = 10;

const TrucksManagement = () => {
  const { user } = useAuth();
  const basePath = user?.role === "ADMIN" ? "/admin" : "/manager";
  const isAdmin = user?.role === "ADMIN";
  const [orders, setOrders] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTruck, setEditingTruck] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingTruckId, setDeletingTruckId] = useState("");
  const [deleteTargetTruck, setDeleteTargetTruck] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    plateNumber: "",
    capacity: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, trucksData] = await Promise.all([getAllOrders(), getTrucks()]);
      const approvedOrders = (ordersData.orders || []).filter(
        (order) => order.orderStatus === "APPROVED"
      );
      setOrders(approvedOrders);
      setTrucks(trucksData.trucks || []);
    } catch (err) {
      toast.error(err.message || "Failed to load trucks");
    } finally {
      setLoading(false);
    }
  };

  const busyTruckTrips = useMemo(
    () =>
      orders.flatMap((order) =>
        (order.deliveryTrips || [])
          .filter((trip) => trip.status !== "DELIVERED" && trip.status !== "CANCELLED")
          .map((trip) => ({
            contractorName: order.contractor?.name || "Contractor",
            trip,
          }))
      ),
    [orders]
  );

  const truckRows = useMemo(
    () =>
      trucks.map((truck) => {
        const busyTripInfo = busyTruckTrips.find(
          ({ trip }) => String(trip.truck?._id || trip.truck) === String(truck._id)
        );

        return {
          ...truck,
          isBusy: Boolean(busyTripInfo),
          busyTripInfo,
        };
      }),
    [trucks, busyTruckTrips]
  );

  const filteredTrucks = useMemo(() => {
    let filtered = [...truckRows];

    if (statusFilter !== "ALL") {
      const shouldBeBusy = statusFilter === "BUSY";
      filtered = filtered.filter((truck) => truck.isBusy === shouldBeBusy);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (truck) =>
          truck.name.toLowerCase().includes(query) ||
          truck.plateNumber.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [truckRows, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTrucks.length / TRUCKS_PER_PAGE));
  const paginatedTrucks = useMemo(() => {
    const startIndex = (currentPage - 1) * TRUCKS_PER_PAGE;
    return filteredTrucks.slice(startIndex, startIndex + TRUCKS_PER_PAGE);
  }, [currentPage, filteredTrucks]);
  const pageStart = filteredTrucks.length === 0 ? 0 : (currentPage - 1) * TRUCKS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * TRUCKS_PER_PAGE, filteredTrucks.length);

  const openEditModal = (truck) => {
    if (truck.isBusy) {
      toast.error("Busy trucks cannot be edited");
      return;
    }

    setEditingTruck(truck);
    setEditForm({
      name: truck.name || "",
      plateNumber: truck.plateNumber || "",
      capacity: String(truck.capacity ?? 0),
    });
  };

  const closeEditModal = () => {
    setEditingTruck(null);
    setEditForm({
      name: "",
      plateNumber: "",
      capacity: "",
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editingTruck) {
      return;
    }

    if (!editForm.name.trim() || !editForm.plateNumber.trim()) {
      toast.error("Please fill in truck name and plate number");
      return;
    }

    const capacityValue = Number(editForm.capacity || 0);
    if (Number.isNaN(capacityValue) || capacityValue < 0) {
      toast.error("Capacity must be a valid non-negative number");
      return;
    }

    setEditLoading(true);
    try {
      const data = await updateTruck(editingTruck._id, {
        name: editForm.name.trim(),
        plateNumber: editForm.plateNumber.trim(),
        capacity: capacityValue,
      });
      toast.success(data.message || "Truck updated");
      closeEditModal();
      await fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to update truck");
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteModal = (truck) => {
    if (!isAdmin) {
      return;
    }

    if (truck.isBusy) {
      toast.error("Busy trucks cannot be deleted");
      return;
    }

    setDeleteTargetTruck(truck);
  };

  const closeDeleteModal = () => {
    setDeleteTargetTruck(null);
  };

  const handleDeleteTruck = async () => {
    if (!deleteTargetTruck) {
      return;
    }

    setDeletingTruckId(deleteTargetTruck._id);
    try {
      const data = await deleteTruck(deleteTargetTruck._id);
      toast.success(data.message || "Truck deleted");
      closeDeleteModal();
      await fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete truck");
    } finally {
      setDeletingTruckId("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading trucks...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Trucks</h1>
          <p className="text-stone-500 mt-1">
            {filteredTrucks.length} of {trucks.length} truck{trucks.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <Link
            to={`${basePath}/trucks/add`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Truck
          </Link>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by truck name or plate"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {filteredTrucks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-600 font-medium">No trucks found</p>
            <p className="text-sm text-stone-400 mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Truck
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Plate Number
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Capacity
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedTrucks.map((truck) => (
                  <tr key={truck._id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900">{truck.name}</p>
                    </td>
                    <td className="px-6 py-4 text-stone-600">{truck.plateNumber}</td>
                    <td className="px-6 py-4 text-stone-600">{truck.capacity || 0}</td>
                    <td className="px-6 py-4">
                      {truck.isBusy ? (
                        <div>
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            Busy
                          </span>
                          <p className="text-xs text-stone-500 mt-1">
                            Trip #{truck.busyTripInfo.trip.tripNumber} for {truck.busyTripInfo.contractorName}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(truck)}
                          disabled={truck.isBusy}
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                          title={truck.isBusy ? "Busy trucks cannot be edited" : "Edit truck"}
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openDeleteModal(truck)}
                            disabled={deletingTruckId === truck._id || truck.isBusy}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title={truck.isBusy ? "Busy trucks cannot be deleted" : "Delete truck"}
                          >
                            {deletingTruckId === truck._id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredTrucks.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-stone-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
              Showing {pageStart}-{pageEnd} of {filteredTrucks.length} trucks
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editingTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
            <h2 className="text-xl font-semibold text-stone-900">Edit Truck</h2>
            <p className="mt-1 text-sm text-stone-500">
              Update truck details for {editingTruck.name}.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Truck Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Plate Number</label>
                <input
                  type="text"
                  value={editForm.plateNumber}
                  onChange={(e) =>
                    setEditForm((current) => ({ ...current, plateNumber: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Capacity</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editForm.capacity}
                  onChange={(e) =>
                    setEditForm((current) => ({ ...current, capacity: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-stone-300 px-6 py-3 font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-xl bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTargetTruck)}
        title="Delete Truck"
        message={
          deleteTargetTruck
            ? `Are you sure you want to delete ${deleteTargetTruck.name} (${deleteTargetTruck.plateNumber})? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Truck"
        confirmVariant="danger"
        loading={Boolean(deleteTargetTruck) && deletingTruckId === deleteTargetTruck?._id}
        onConfirm={handleDeleteTruck}
        onCancel={closeDeleteModal}
      />
    </div>
  );
};

export default TrucksManagement;
