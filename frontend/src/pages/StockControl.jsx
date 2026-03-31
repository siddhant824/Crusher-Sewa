import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getMaterials } from "../services/materialsApi.js";
import {
  createManualAdjustment,
  createProductionEntry,
  getInventoryLogs,
} from "../services/stockApi.js";

const changeTypeStyles = {
  PRODUCTION: "bg-teal-50 text-teal-700 border-teal-200",
  MANUAL_ADJUSTMENT: "bg-amber-50 text-amber-700 border-amber-200",
  ORDER_APPROVAL: "bg-sky-50 text-sky-700 border-sky-200",
};

const formatQuantity = (value) => Number(value || 0).toFixed(2);
const LOGS_PER_PAGE = 10;

const StockControl = () => {
  const [materials, setMaterials] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
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
  const [inventoryFilters, setInventoryFilters] = useState({
    materialId: "ALL",
    changeType: "ALL",
    fromDate: "",
    toDate: "",
    page: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setInventoryFilters((current) => ({ ...current, page: 1 }));
  }, [
    inventoryFilters.materialId,
    inventoryFilters.changeType,
    inventoryFilters.fromDate,
    inventoryFilters.toDate,
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [materialsData, inventoryData] = await Promise.all([
        getMaterials(),
        getInventoryLogs(),
      ]);

      const fetchedMaterials = materialsData.materials || [];
      setMaterials(fetchedMaterials);
      setInventoryLogs(inventoryData.logs || []);

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

  const selectedProductionMaterial = materials.find(
    (material) => material._id === productionForm.materialId
  );
  const selectedAdjustmentMaterial = materials.find(
    (material) => material._id === adjustmentForm.materialId
  );

  const filteredInventoryLogs = useMemo(() => {
    return inventoryLogs.filter((log) => {
      const logDate = String(log.createdAt).slice(0, 10);
      const materialMatch =
        inventoryFilters.materialId === "ALL" ||
        String(log.material?._id) === inventoryFilters.materialId;
      const typeMatch =
        inventoryFilters.changeType === "ALL" ||
        log.changeType === inventoryFilters.changeType;
      const fromMatch = !inventoryFilters.fromDate || logDate >= inventoryFilters.fromDate;
      const toMatch = !inventoryFilters.toDate || logDate <= inventoryFilters.toDate;

      return materialMatch && typeMatch && fromMatch && toMatch;
    });
  }, [inventoryLogs, inventoryFilters]);

  const inventoryPageCount = Math.max(
    1,
    Math.ceil(filteredInventoryLogs.length / LOGS_PER_PAGE)
  );

  const paginatedInventoryLogs = useMemo(() => {
    const startIndex = (inventoryFilters.page - 1) * LOGS_PER_PAGE;
    return filteredInventoryLogs.slice(startIndex, startIndex + LOGS_PER_PAGE);
  }, [filteredInventoryLogs, inventoryFilters.page]);

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
    <div className="space-y-8">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-stone-900">Stock Control</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-500">
          Monitor current stock, record daily production, and handle corrections from one simpler screen.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Production Entry</h2>
            <p className="mt-1 text-sm text-stone-500">
              Use this when new crusher production increases stock.
            </p>

            <form onSubmit={handleProductionSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Material</label>
                <select
                  value={productionForm.materialId}
                  onChange={(e) =>
                    setProductionForm((current) => ({ ...current, materialId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
                >
                  {materials.map((material) => (
                    <option key={material._id} value={material._id}>
                      {material.name}
                    </option>
                  ))}
                </select>
                {selectedProductionMaterial ? (
                  <p className="text-xs text-stone-500">
                    Current stock: {formatQuantity(selectedProductionMaterial.stock)}{" "}
                    {selectedProductionMaterial.unit}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">Quantity Produced</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={productionForm.quantityProduced}
                    onChange={(e) =>
                      setProductionForm((current) => ({
                        ...current,
                        quantityProduced: e.target.value,
                      }))
                    }
                    placeholder="e.g. 25"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">Production Date</label>
                  <input
                    type="date"
                    value={productionForm.productionDate}
                    onChange={(e) =>
                      setProductionForm((current) => ({
                        ...current,
                        productionDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Note</label>
                <textarea
                  value={productionForm.note}
                  onChange={(e) =>
                    setProductionForm((current) => ({ ...current, note: e.target.value }))
                  }
                  placeholder="Optional production note"
                  className="min-h-24 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={productionSubmitting}
                className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {productionSubmitting ? "Saving..." : "Save Production Entry"}
              </button>
            </form>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Manual Adjustment</h2>
            <p className="mt-1 text-sm text-stone-500">
              Use this only for corrections, wastage, or stock reconciliation.
            </p>

            <form onSubmit={handleAdjustmentSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Material</label>
                <select
                  value={adjustmentForm.materialId}
                  onChange={(e) =>
                    setAdjustmentForm((current) => ({ ...current, materialId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
                >
                  {materials.map((material) => (
                    <option key={material._id} value={material._id}>
                      {material.name}
                    </option>
                  ))}
                </select>
                {selectedAdjustmentMaterial ? (
                  <p className="text-xs text-stone-500">
                    Current stock: {formatQuantity(selectedAdjustmentMaterial.stock)}{" "}
                    {selectedAdjustmentMaterial.unit}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Quantity Change</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={adjustmentForm.quantityChange}
                  onChange={(e) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      quantityChange: e.target.value,
                    }))
                  }
                  placeholder="Use positive to add, negative to reduce"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Reason</label>
                <textarea
                  value={adjustmentForm.note}
                  onChange={(e) =>
                    setAdjustmentForm((current) => ({ ...current, note: e.target.value }))
                  }
                  placeholder="Explain why this stock correction is needed"
                  className="min-h-24 w-full rounded-lg border border-stone-300 px-3 py-2"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={adjustmentSubmitting}
                className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {adjustmentSubmitting ? "Applying..." : "Apply Adjustment"}
              </button>
            </form>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Inventory Activity</h2>
          <p className="mt-1 text-sm text-stone-500">
            All production, manual adjustments, and stock deductions are recorded here.
          </p>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-4">
          <select
            value={inventoryFilters.materialId}
            onChange={(e) =>
              setInventoryFilters((current) => ({ ...current, materialId: e.target.value }))
            }
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All Materials</option>
            {materials.map((material) => (
              <option key={material._id} value={material._id}>
                {material.name}
              </option>
            ))}
          </select>
          <select
            value={inventoryFilters.changeType}
            onChange={(e) =>
              setInventoryFilters((current) => ({ ...current, changeType: e.target.value }))
            }
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="PRODUCTION">Production</option>
            <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
            <option value="ORDER_APPROVAL">Order Approval</option>
          </select>
          <input
            type="date"
            value={inventoryFilters.fromDate}
            onChange={(e) =>
              setInventoryFilters((current) => ({ ...current, fromDate: e.target.value }))
            }
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={inventoryFilters.toDate}
            onChange={(e) =>
              setInventoryFilters((current) => ({ ...current, toDate: e.target.value }))
            }
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-200">
          {filteredInventoryLogs.length === 0 ? (
            <div className="p-8 text-sm text-stone-400">No inventory logs yet.</div>
          ) : (
            <table className="w-full min-w-[980px]">
              <thead className="bg-stone-50">
                <tr className="border-b border-stone-200">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                    Material
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                    Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                    Stock Movement
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                    Recorded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedInventoryLogs.map((log) => (
                  <tr key={log._id} className="align-top">
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">
                      {log.material?.name}
                    </td>
                    <td className="px-4 py-3">
                      <p
                        className={`text-sm font-semibold ${
                          Number(log.quantityChange) >= 0 ? "text-teal-600" : "text-rose-600"
                        }`}
                      >
                        {Number(log.quantityChange) >= 0 ? "+" : ""}
                        {formatQuantity(log.quantityChange)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {formatQuantity(log.stockBefore)} {"->"} {formatQuantity(log.stockAfter)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          changeTypeStyles[log.changeType] ||
                          "bg-stone-50 text-stone-700 border-stone-200"
                        }`}
                      >
                        {log.changeType.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500">
                      <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                      <p className="mt-1 text-xs">by {log.updatedBy?.name}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredInventoryLogs.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
              Showing {(inventoryFilters.page - 1) * LOGS_PER_PAGE + 1}-
              {Math.min(inventoryFilters.page * LOGS_PER_PAGE, filteredInventoryLogs.length)} of{" "}
              {filteredInventoryLogs.length} logs
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={inventoryFilters.page === 1}
                onClick={() =>
                  setInventoryFilters((current) => ({ ...current, page: current.page - 1 }))
                }
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
                Page {inventoryFilters.page} of {inventoryPageCount}
              </span>
              <button
                type="button"
                disabled={inventoryFilters.page === inventoryPageCount}
                onClick={() =>
                  setInventoryFilters((current) => ({ ...current, page: current.page + 1 }))
                }
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StockControl;
