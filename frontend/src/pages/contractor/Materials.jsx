import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getMaterials } from "../../services/materialsApi.js";
import { createOrder } from "../../services/ordersApi.js";
import { clearDraftOrder, getDraftOrder, saveDraftOrder } from "../../utils/orderDraft.js";

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    const draftItems = getDraftOrder();
    if (draftItems.length === 0) {
      return;
    }

    const nextQuantities = {};
    draftItems.forEach((item) => {
      if (item.materialId && item.quantity) {
        nextQuantities[item.materialId] = String(item.quantity);
      }
    });
    setQuantities(nextQuantities);
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await getMaterials();
      setMaterials(data.materials || []);
    } catch (err) {
      toast.error(err.message || "Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const selectedItems = materials
    .map((material) => {
      const quantity = Number(quantities[material._id] || 0);
      return quantity > 0
        ? {
            materialId: material._id,
            material,
            quantity,
            subtotal: quantity * material.ratePerCuMetre,
          }
        : null;
    })
    .filter(Boolean);

  const orderTotal = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);

  useEffect(() => {
    const draftItems = selectedItems.map((item) => ({
      materialId: item.materialId,
      name: item.material.name,
      unit: item.material.unit,
      quantity: item.quantity,
      ratePerCuMetre: item.material.ratePerCuMetre,
      subtotal: item.subtotal,
    }));

    saveDraftOrder(draftItems);
  }, [selectedItems]);

  const handleQuantityChange = (materialId, value) => {
    setQuantities((current) => ({
      ...current,
      [materialId]: value,
    }));
  };

  const handlePlaceOrder = async () => {
    if (selectedItems.length === 0) {
      toast.error("Select at least one material quantity to place an order");
      return;
    }

    setPlacingOrder(true);
    try {
      const payload = selectedItems.map((item) => ({
        materialId: item.materialId,
        quantity: item.quantity,
      }));

      const data = await createOrder(payload);
      toast.success(data.message || "Order placed successfully");
      setQuantities({});
      clearDraftOrder();
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleQuickAdd = (material) => {
    if (material.stock <= 0) {
      return;
    }

    const enteredQuantity = Number(quantities[material._id] || 0);
    const nextQuantity = enteredQuantity > 0 ? String(enteredQuantity) : "1";

    setQuantities((current) => ({
      ...current,
      [material._id]: nextQuantity,
    }));
    toast.success(`${material.name} added with quantity ${nextQuantity}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-stone-500">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Materials</h1>
        <p className="text-stone-500 mt-1">
          Browse available construction materials
        </p>
      </div>

      {materials.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-stone-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-stone-600 font-medium">No materials available</p>
          <p className="text-sm text-stone-400 mt-1">Check back later for updates</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => {
            const available = material.stock === undefined || material.stock > 0;
            const selectedQuantity = quantities[material._id] || "";
            const imageUrl = material.imageUrl
              ? material.imageUrl.startsWith("http")
                ? material.imageUrl
                : `${apiBase}${material.imageUrl}`
              : null;

            return (
              <div
                key={material._id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  available
                    ? "border-stone-200 hover:border-teal-300 hover:shadow-sm"
                    : "border-stone-100 opacity-60"
                }`}
              >
                {imageUrl && (
                  <div className="w-full h-48 bg-stone-100">
                    <img src={imageUrl} alt={material.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    {!imageUrl && (
                      <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      available
                        ? "bg-teal-50 text-teal-700"
                        : "bg-stone-100 text-stone-500"
                    }`}>
                      {available ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  <h3 className="font-semibold text-stone-900 mb-1">{material.name}</h3>
                  <p className="text-sm text-stone-500 mb-2">Per {material.unit}</p>
                  {material.stock !== undefined && material.stock !== null && (
                    <p className="text-xs text-stone-400 mb-4">Stock: {material.stock}</p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-lg font-semibold text-stone-900">
                      Rs. {material.ratePerCuMetre?.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!available}
                      value={selectedQuantity}
                      onChange={(e) => handleQuantityChange(material._id, e.target.value)}
                      placeholder="Qty"
                      className="px-3 py-2 text-sm border border-stone-300 rounded-lg disabled:bg-stone-100"
                    />
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => handleQuickAdd(material)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        available
                          ? "bg-teal-600 text-white hover:bg-teal-700"
                          : "bg-stone-100 text-stone-400 cursor-not-allowed"
                      }`}
                    >
                      Quick Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-stone-900">Order Summary</h2>
            <p className="text-sm text-stone-500 mt-1">
              Select one or more materials, then place a single order request for approval.
            </p>

            {selectedItems.length === 0 ? (
              <p className="text-sm text-stone-400 mt-4">
                No materials selected yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedItems.map((item) => (
                  <div
                    key={item.materialId}
                    className="flex items-center justify-between gap-4 border border-stone-100 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{item.material.name}</p>
                      <p className="text-sm text-stone-500">
                        {item.quantity} {item.material.unit} x Rs. {item.material.ratePerCuMetre.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-medium text-stone-900">
                      Rs. {item.subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 bg-stone-50 border border-stone-200 rounded-xl p-4">
            <p className="text-sm text-stone-500">Selected Items</p>
            <p className="text-2xl font-semibold text-stone-900 mt-1">
              {selectedItems.length}
            </p>
            <p className="text-sm text-stone-500 mt-4">Estimated Total</p>
            <p className="text-2xl font-semibold text-stone-900 mt-1">
              Rs. {orderTotal.toFixed(2)}
            </p>
            <button
              type="button"
              disabled={placingOrder || selectedItems.length === 0}
              onClick={handlePlaceOrder}
              className="w-full mt-5 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placingOrder ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Materials;
