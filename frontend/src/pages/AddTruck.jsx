import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth.js";
import { createTruck } from "../services/truckApi.js";

const AddTruck = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === "ADMIN" ? "/admin" : "/manager";
  const [truckForm, setTruckForm] = useState({
    name: "",
    plateNumber: "",
    capacity: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!truckForm.name.trim() || !truckForm.plateNumber.trim()) {
      toast.error("Please fill in truck name and plate number");
      setLoading(false);
      return;
    }

    try {
      const data = await createTruck({
        ...truckForm,
        name: truckForm.name.trim(),
        plateNumber: truckForm.plateNumber.trim(),
        capacity: Number(truckForm.capacity || 0),
      });
      toast.success(data.message || "Truck created");
      navigate(`${basePath}/trucks`);
    } catch (err) {
      toast.error(err.message || "Failed to create truck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Add Truck</h1>
        <p className="mt-2 text-sm text-stone-500">
          Create a new truck record for delivery trip assignments.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Truck Name
              </label>
              <input
                type="text"
                value={truckForm.name}
                onChange={(e) => setTruckForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="e.g., Truck 1"
                className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Plate Number
              </label>
              <input
                type="text"
                value={truckForm.plateNumber}
                onChange={(e) => setTruckForm((current) => ({ ...current, plateNumber: e.target.value }))}
                placeholder="e.g., 0021"
                className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Capacity
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={truckForm.capacity}
                onChange={(e) => setTruckForm((current) => ({ ...current, capacity: e.target.value }))}
                placeholder="0"
                className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400"
              />
            </div>

          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/trucks`)}
              className="rounded-xl border border-stone-300 px-6 py-3 font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Truck"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTruck;
