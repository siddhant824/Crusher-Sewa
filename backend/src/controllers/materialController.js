import Material from "../models/Material.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { applyStockChange } from "../services/stockService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all materials (accessible to all authenticated users)
export const getMaterials = async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    return res.json({ materials });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to fetch materials", error: err.message });
  }
};

// Create material (ADMIN/MANAGER only)
export const createMaterial = async (req, res) => {
  try {
    const { name, ratePerCuMetre, unit, stock } = req.body;

    if (!name || !ratePerCuMetre) {
      return res.status(400).json({
        message: "Please provide name and ratePerCuMetre",
      });
    }

    // Parse ratePerCuMetre and stock as numbers
    const rate = parseFloat(ratePerCuMetre);
    const stockValue = stock ? parseFloat(stock) : 0;

    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({
        message: "ratePerCuMetre must be a valid positive number",
      });
    }

    if (stock && (isNaN(stockValue) || stockValue < 0)) {
      return res.status(400).json({
        message: "stock must be a valid positive number",
      });
    }

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/materials/${req.file.filename}`;
    }

    const material = await Material.create({
      name: name.trim(),
      ratePerCuMetre: rate,
      unit: unit?.trim() || "cubic metre",
      stock: 0,
      imageUrl,
    });

    if (stockValue > 0) {
      await applyStockChange({
        materialId: material._id,
        quantityChange: stockValue,
        changeType: "MANUAL_ADJUSTMENT",
        note: "Opening stock entered while creating material",
        updatedBy: req.user._id,
      });
    }

    const createdMaterial = await Material.findById(material._id);

    return res.status(201).json({
      material: createdMaterial,
      message: "Material created successfully",
    });
  } catch (err) {
    // Handle duplicate key error (unique name constraint)
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A material with this name already exists",
      });
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        message: errors[0] || "Validation failed. Please check your input.",
      });
    }

    return res.status(500).json({
      message: "Failed to create material",
      error: err.message,
    });
  }
};

// Update material (ADMIN/MANAGER only)
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ratePerCuMetre, unit, stock } = req.body;

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Prepare update object
    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (ratePerCuMetre !== undefined) {
      const rate = parseFloat(ratePerCuMetre);
      if (isNaN(rate) || rate < 0) {
        return res.status(400).json({
          message: "ratePerCuMetre must be a valid positive number",
        });
      }
      updateData.ratePerCuMetre = rate;
    }

    if (unit !== undefined) {
      updateData.unit = unit.trim();
    }

    let targetStockValue;
    if (stock !== undefined) {
      targetStockValue = parseFloat(stock);
      if (isNaN(targetStockValue) || targetStockValue < 0) {
        return res.status(400).json({
          message: "stock must be a valid positive number",
        });
      }
    }

    // Handle image upload (optional - only if new image is uploaded)
    if (req.file) {
      // Delete old image if exists
      if (material.imageUrl) {
        // Remove leading slash if present and join with project root
        const oldImagePathRel = material.imageUrl.startsWith("/")
          ? material.imageUrl.slice(1)
          : material.imageUrl;
        const oldImagePath = path.join(__dirname, "../..", oldImagePathRel);
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (unlinkErr) {
          console.error("Error deleting old image:", unlinkErr);
        }
      }

      updateData.imageUrl = `/uploads/materials/${req.file.filename}`;
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (stock !== undefined && targetStockValue !== material.stock) {
      await applyStockChange({
        materialId: material._id,
        quantityChange: Number((targetStockValue - material.stock).toFixed(2)),
        changeType: "MANUAL_ADJUSTMENT",
        note: "Stock updated from material management",
        updatedBy: req.user._id,
      });
    }

    const refreshedMaterial = await Material.findById(id);

    return res.json({
      material: refreshedMaterial || updatedMaterial,
      message: "Material updated successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A material with this name already exists",
      });
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        message: errors[0] || "Validation failed. Please check your input.",
      });
    }

    return res.status(500).json({
      message: "Failed to update material",
      error: err.message,
    });
  }
};

// Delete material (ADMIN only)
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Delete associated image file if exists
    if (material.imageUrl) {
      // Remove leading slash if present and join with project root
      const imagePathRel = material.imageUrl.startsWith("/") 
        ? material.imageUrl.slice(1) 
        : material.imageUrl;
      const imagePath = path.join(__dirname, "../..", imagePathRel);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (unlinkErr) {
        console.error("Error deleting image file:", unlinkErr);
        // Continue with material deletion even if image deletion fails
      }
    }

    await Material.findByIdAndDelete(id);

    return res.json({
      message: "Material deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to delete material",
      error: err.message,
    });
  }
};
