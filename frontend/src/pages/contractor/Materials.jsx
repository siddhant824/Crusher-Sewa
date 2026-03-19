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
    if (value === "") {
      setQuantities((current) => ({
        ...current,
        [materialId]: value,
      }));
      return;
    }

    const nextValue = Math.max(Number(value), 1);

    setQuantities((current) => ({
      ...current,
      [materialId]: String(nextValue),
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
    const unitLabel = material.unit || "cubic metre";

    setQuantities((current) => ({
      ...current,
      [material._id]: nextQuantity,
    }));
    toast.success(`${material.name} added with ${nextQuantity} ${unitLabel}`);
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
      <div className="mb-8 rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_55%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Material Booking
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
              Browse materials and prepare your next order
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              Check live stock, choose the quantity you need, and build a clean order request before sending it for approval.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Available Materials</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{materials.length}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Draft Items</p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{selectedItems.length}</p>
            </div>
          </div>
        </div>
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                className={`group overflow-hidden rounded-[24px] border bg-white transition-all ${
                  available
                    ? "border-stone-200 shadow-sm hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/5"
                    : "border-stone-100 opacity-60"
                }`}
              >
                {imageUrl && (
                  <div className="h-52 w-full overflow-hidden bg-stone-100">
                    <img src={imageUrl} alt={material.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    {!imageUrl && (
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100">
                        <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      available
                        ? "bg-teal-50 text-teal-700"
                        : "bg-stone-100 text-stone-500"
                    }`}>
                      {available ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-stone-900">{material.name}</h3>
                  <p className="mt-1 text-sm text-stone-500">Per {material.unit}</p>
                  {material.stock !== undefined && material.stock !== null && (
                    <p className="mt-3 text-sm text-stone-500">
                      Stock: {material.stock} {material.unit || "cubic metre"}
                    </p>
                  )}

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Rate</p>
                      <span className="mt-1 block text-2xl font-semibold tracking-tight text-stone-900">
                        Rs. {material.ratePerCuMetre?.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Unit</p>
                      <p className="mt-1 text-sm font-medium text-stone-700">{material.unit}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <div className="rounded-2xl border border-stone-300 bg-white transition-colors group-hover:border-teal-200">
                      <div className="flex items-center justify-between gap-2 px-3 py-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          disabled={!available}
                          value={selectedQuantity}
                          onChange={(e) => handleQuantityChange(material._id, e.target.value)}
                          placeholder="Qty"
                          className="w-full bg-transparent p-0 text-sm text-stone-900 border-0 focus:ring-0 disabled:bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="whitespace-nowrap text-xs text-stone-400">
                          cubic metre
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => handleQuickAdd(material)}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                        available
                          ? "bg-teal-600 text-white hover:bg-teal-700"
                          : "cursor-not-allowed bg-stone-100 text-stone-400"
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

      <div className="mt-8 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight text-stone-900">Order Summary</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Review selected materials before sending the order for approval.
            </p>

            {selectedItems.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
                <p className="text-sm text-stone-400">
                  No materials selected yet.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {selectedItems.map((item) => (
                  <div
                    key={item.materialId}
                    className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900">{item.material.name}</p>
                      <p className="mt-1 text-sm text-stone-500">
                        {item.quantity} {item.material.unit} x Rs. {item.material.ratePerCuMetre.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-stone-900">
                      Rs. {item.subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full rounded-[24px] border border-stone-200 bg-stone-50 p-5 xl:w-80">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Selected Items</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              {selectedItems.length}
            </p>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Estimated Total</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Rs. {orderTotal.toFixed(2)}
            </p>
            <button
              type="button"
              disabled={placingOrder || selectedItems.length === 0}
              onClick={handlePlaceOrder}
              className="mt-6 w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
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
