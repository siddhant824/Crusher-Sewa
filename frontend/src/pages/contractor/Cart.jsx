import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { createOrder } from "../../services/ordersApi.js";
import { clearDraftOrder, getDraftOrder, saveDraftOrder } from "../../utils/orderDraft.js";

const Cart = () => {
  const [items, setItems] = useState(() => getDraftOrder());
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    setItems(getDraftOrder());
  }, []);

  useEffect(() => {
    saveDraftOrder(items);
    window.dispatchEvent(new Event("order-cart-updated"));
  }, [items]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    [items]
  );

  const updateQuantity = (materialId, value) => {
    setItems((current) =>
      current
        .map((item) => {
          if (item.materialId !== materialId) {
            return item;
          }

          if (value === "") {
            return { ...item, quantity: "" };
          }

          const quantity = Math.max(Number(value), 0);
          if (quantity === 0) {
            return null;
          }

          return {
            ...item,
            quantity,
            subtotal: Number((quantity * Number(item.ratePerCuMetre || 0)).toFixed(2)),
          };
        })
        .filter(Boolean)
    );
  };

  const changeQuantityByStep = (materialId, delta) => {
    setItems((current) =>
      current
        .map((item) => {
          if (item.materialId !== materialId) {
            return item;
          }

          const nextQuantity = Math.max(Number(item.quantity || 0) + delta, 0);
          if (nextQuantity === 0) {
            return null;
          }

          return {
            ...item,
            quantity: nextQuantity,
            subtotal: Number((nextQuantity * Number(item.ratePerCuMetre || 0)).toFixed(2)),
          };
        })
        .filter(Boolean)
    );
  };

  const removeItem = (materialId) => {
    setItems((current) => current.filter((item) => item.materialId !== materialId));
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setPlacingOrder(true);
    try {
      const payload = items.map((item) => ({
        materialId: item.materialId,
        quantity: Number(item.quantity),
      }));

      const data = await createOrder(payload);
      toast.success(data.message || "Order placed successfully");
      clearDraftOrder();
      setItems([]);
      window.dispatchEvent(new Event("order-cart-updated"));
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#eefbf7_0%,#ffffff_45%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              Cart
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">Review Your Cart</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
              Update quantity and place your material order when ready.
            </p>
          </div>
          <Link
            to="/contractor/materials"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-stone-900">Your cart is empty</p>
          <p className="mt-2 text-sm text-stone-500">Add materials from the Materials page to place an order.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.materialId} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-stone-900">{item.name}</p>
                    <p className="text-sm text-stone-500">
                      Rs. {Number(item.ratePerCuMetre).toFixed(2)} per {item.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => changeQuantityByStep(item.materialId, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.materialId, e.target.value)}
                        className="w-16 rounded-md border border-stone-200 px-2 py-1.5 text-center text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => changeQuantityByStep(item.materialId, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        +
                      </button>
                    </div>
                    <p className="w-28 text-right text-sm font-semibold text-stone-900">
                      Rs. {Number(item.subtotal).toFixed(2)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.materialId)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xl font-semibold text-stone-900">Total: Rs. {total.toFixed(2)}</p>
              <button
                type="button"
                disabled={placingOrder || items.length === 0}
                onClick={handlePlaceOrder}
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {placingOrder ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
