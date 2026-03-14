import Material from "../models/Material.js";
import InventoryLog from "../models/InventoryLog.js";

const stockQueryForChange = (materialId, quantityChange) => {
  if (quantityChange >= 0) {
    return { _id: materialId };
  }

  return {
    _id: materialId,
    stock: { $gte: Math.abs(quantityChange) },
  };
};

export const applyStockChange = async ({
  materialId,
  quantityChange,
  changeType,
  note = "",
  updatedBy,
}) => {
  const material = await Material.findById(materialId);
  if (!material) {
    throw new Error("Material not found");
  }

  const stockBefore = material.stock;
  const stockAfter = Number((stockBefore + quantityChange).toFixed(2));

  if (stockAfter < 0) {
    throw new Error(`Insufficient stock for ${material.name}`);
  }

  const updatedMaterial = await Material.findOneAndUpdate(
    stockQueryForChange(materialId, quantityChange),
    { $inc: { stock: quantityChange } },
    { new: true }
  );

  if (!updatedMaterial) {
    throw new Error(`Insufficient stock for ${material.name}`);
  }

  const inventoryLog = await InventoryLog.create({
    material: materialId,
    changeType,
    quantityChange,
    stockBefore,
    stockAfter,
    note,
    updatedBy,
  });

  return { material: updatedMaterial, inventoryLog };
};
