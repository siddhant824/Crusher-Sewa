import InventoryLog from "../models/InventoryLog.js";
import Material from "../models/Material.js";
import ProductionLog from "../models/ProductionLog.js";
import { applyStockChange } from "../services/stockService.js";

export const createProductionEntry = async (req, res) => {
  const { materialId, quantityProduced, productionDate, note } = req.body;

  const quantity = Number(quantityProduced);
  if (!materialId || Number.isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: "Please provide a valid material and quantity produced",
    });
  }

  try {
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    const effectiveProductionDate = productionDate ? new Date(productionDate) : new Date();
    if (Number.isNaN(effectiveProductionDate.getTime())) {
      return res.status(400).json({ message: "productionDate must be a valid date" });
    }

    const productionLog = await ProductionLog.create({
      material: materialId,
      quantityProduced: quantity,
      productionDate: effectiveProductionDate,
      note: note?.trim() || "",
      createdBy: req.user._id,
    });

    const { material: updatedMaterial, inventoryLog } = await applyStockChange({
      materialId,
      quantityChange: quantity,
      changeType: "PRODUCTION",
      note: note?.trim() || `Production entry for ${material.name}`,
      updatedBy: req.user._id,
    });

    const populatedProductionLog = await ProductionLog.findById(productionLog._id)
      .populate("material", "name unit stock")
      .populate("createdBy", "name email role");

    return res.status(201).json({
      productionLog: populatedProductionLog,
      inventoryLog,
      material: updatedMaterial,
      message: "Production entry recorded and stock updated successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to create production entry",
      error: err.message,
    });
  }
};

export const createManualAdjustment = async (req, res) => {
  const { materialId, quantityChange, note } = req.body;
  const change = Number(quantityChange);

  if (!materialId || Number.isNaN(change) || change === 0) {
    return res.status(400).json({
      message: "Please provide a valid material and non-zero quantity change",
    });
  }

  if (!note?.trim()) {
    return res.status(400).json({
      message: "Please provide a note for the manual adjustment",
    });
  }

  try {
    const { material, inventoryLog } = await applyStockChange({
      materialId,
      quantityChange: change,
      changeType: "MANUAL_ADJUSTMENT",
      note: note.trim(),
      updatedBy: req.user._id,
    });

    return res.status(201).json({
      material,
      inventoryLog,
      message: "Manual stock adjustment applied successfully",
    });
  } catch (err) {
    const status = err.message.includes("Insufficient stock") ? 400 : 500;
    return res.status(status).json({
      message: err.message || "Failed to apply manual adjustment",
    });
  }
};

export const getInventoryLogs = async (_req, res) => {
  try {
    const logs = await InventoryLog.find()
      .populate("material", "name unit")
      .populate("updatedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch inventory logs",
      error: err.message,
    });
  }
};

export const getProductionLogs = async (_req, res) => {
  try {
    const logs = await ProductionLog.find()
      .populate("material", "name unit")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch production logs",
      error: err.message,
    });
  }
};
