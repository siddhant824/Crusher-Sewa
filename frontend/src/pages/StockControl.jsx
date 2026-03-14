import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMaterials } from "../services/materialsApi.js";
import {
  createManualAdjustment,
  createProductionEntry,
  getInventoryLogs,
  getProductionLogs,
} from "../services/stockApi.js";

const changeTypeStyles = {
  PRODUCTION: "bg-teal-50 text-teal-700 border-teal-200",
  MANUAL_ADJUSTMENT: "bg-amber-50 text-amber-700 border-amber-200",
  ORDER_APPROVAL: "bg-sky-50 text-sky-700 border-sky-200",
};

const StockControl = () => {
  const [materials, setMaterials] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [productionLogs, setProductionLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productionSubmitting, setProductionSubmitting] = useState(false);
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const [productionForm, setProductionForm] = useState({
    materialId: "",
    quantityProduced: "",
    productionDate: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    materialId: "",
    quantityChange: "",
    note: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [materialsData, inventoryData, productionData] = await Promise.all([
        getMaterials(),
        getInventoryLogs(),
        getProductionLogs(),
      ]);

      const fetchedMaterials = materialsData.materials || [];
      setMaterials(fetchedMaterials);
      setInventoryLogs(inventoryData.logs || []);
      setProductionLogs(productionData.logs || []);

      if (fetchedMaterials.length > 0) {
        setProductionForm((current) => ({
          ...current,
          materialId: current.materialId || fetchedMaterials[0]._id,
        }));
        setAdjustmentForm((current) => ({
          ...current,
          materialId: current.materialId || fetchedMaterials[0]._id,
        }));
      }
    } catch (err) {
      toast.error(err.message || "Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  const handleProductionSubmit = async (e) => {
    e.preventDefault();
    setProductionSubmitting(true);
    try {
      const data = await createProductionEntry({
        ...productionForm,
        quantityProduced: Number(productionForm.quantityProduced),
      });
      toast.success(data.message || "Production recorded");
      setProductionForm((current) => ({
        ...current,
        quantityProduced: "",
        note: "",
      }));
      await loadData();
    } catch (err) {
      toast.error(err.message || "Failed to save production entry");
    } finally {
      setProductionSubmitting(false);
    }
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    setAdjustmentSubmitting(true);
    try {
      const data = await createManualAdjustment({
        ...adjustmentForm,
        quantityChange: Number(adjustmentForm.quantityChange),
      });
      toast.success(data.message || "Manual adjustment applied");
      setAdjustmentForm((current) => ({
        ...current,
        quantityChange: "",
        note: "",
      }));
      await loadData();
    } catch (err) {
      toast.error(err.message || "Failed to apply manual adjustment");
    } finally {
      setAdjustmentSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading stock controls...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Stock Control</h1>
        <p className="text-stone-500 mt-1">
          Record production, apply manual adjustments, and review stock history.
        </p>
      </div>

      <div className="grid xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Production Entry</h2>
          <form onSubmit={handleProductionSubmit} className="space-y-4">
            <select
              value={productionForm.materialId}
              onChange={(e) => setProductionForm((current) => ({ ...current, materialId: e.target.value }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
            >
              {materials.map((material) => (
                <option key={material._id} value={material._id}>
                  {material.name} (stock: {material.stock})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={productionForm.quantityProduced}
              onChange={(e) => setProductionForm((current) => ({ ...current, quantityProduced: e.target.value }))}
              placeholder="Quantity produced"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              required
            />
            <input
              type="date"
              value={productionForm.productionDate}
              onChange={(e) => setProductionForm((current) => ({ ...current, productionDate: e.target.value }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              required
            />
            <textarea
              value={productionForm.note}
              onChange={(e) => setProductionForm((current) => ({ ...current, note: e.target.value }))}
              placeholder="Optional note"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg min-h-24"
            />
            <button
              type="submit"
              disabled={productionSubmitting}
              className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {productionSubmitting ? "Saving..." : "Save Production Entry"}
            </button>
          </form>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Manual Stock Adjustment</h2>
          <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
            <select
              value={adjustmentForm.materialId}
              onChange={(e) => setAdjustmentForm((current) => ({ ...current, materialId: e.target.value }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
            >
              {materials.map((material) => (
                <option key={material._id} value={material._id}>
                  {material.name} (stock: {material.stock})
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              value={adjustmentForm.quantityChange}
              onChange={(e) => setAdjustmentForm((current) => ({ ...current, quantityChange: e.target.value }))}
              placeholder="Use positive to add, negative to reduce"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              required
            />
            <textarea
              value={adjustmentForm.note}
              onChange={(e) => setAdjustmentForm((current) => ({ ...current, note: e.target.value }))}
              placeholder="Reason for adjustment"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg min-h-24"
              required
            />
            <button
              type="submit"
              disabled={adjustmentSubmitting}
              className="w-full px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
            >
              {adjustmentSubmitting ? "Applying..." : "Apply Adjustment"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Recent Inventory Logs</h2>
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {inventoryLogs.length === 0 ? (
              <p className="text-sm text-stone-400">No inventory logs yet.</p>
            ) : (
              inventoryLogs.map((log) => (
                <div key={log._id} className="border border-stone-100 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-stone-900">{log.material?.name}</p>
                      <p className="text-sm text-stone-500">
                        {new Date(log.createdAt).toLocaleString()} by {log.updatedBy?.name}
                      </p>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${changeTypeStyles[log.changeType] || "bg-stone-50 text-stone-700 border-stone-200"}`}>
                      {log.changeType}
                    </span>
                  </div>
                  <p className={`text-sm font-medium mt-3 ${log.quantityChange >= 0 ? "text-teal-600" : "text-rose-600"}`}>
                    {log.quantityChange >= 0 ? "+" : ""}{Number(log.quantityChange).toFixed(2)}
                  </p>
                  <p className="text-sm text-stone-500 mt-1">
                    Stock: {log.stockBefore} {"->"} {log.stockAfter}
                  </p>
                  {log.note && <p className="text-sm text-stone-600 mt-2">{log.note}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Recent Production Logs</h2>
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {productionLogs.length === 0 ? (
              <p className="text-sm text-stone-400">No production logs yet.</p>
            ) : (
              productionLogs.map((log) => (
                <div key={log._id} className="border border-stone-100 rounded-lg p-4">
                  <p className="font-medium text-stone-900">{log.material?.name}</p>
                  <p className="text-sm text-stone-500 mt-1">
                    Produced {Number(log.quantityProduced).toFixed(2)} {log.material?.unit} on{" "}
                    {new Date(log.productionDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-stone-500 mt-1">
                    Entered by {log.createdBy?.name} at {new Date(log.createdAt).toLocaleString()}
                  </p>
                  {log.note && <p className="text-sm text-stone-600 mt-2">{log.note}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockControl;
