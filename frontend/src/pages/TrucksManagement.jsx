import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getAllOrders } from "../services/ordersApi.js";
import { useAuth } from "../hooks/useAuth.js";
import { getTrucks } from "../services/truckApi.js";

const TRUCKS_PER_PAGE = 10;

const TrucksManagement = () => {
  const { user } = useAuth();
  const basePath = user?.role === "ADMIN" ? "/admin" : "/manager";
  const [orders, setOrders] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
        <Link
          to={`${basePath}/trucks/add`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Truck
        </Link>
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
    </div>
  );
};

export default TrucksManagement;
