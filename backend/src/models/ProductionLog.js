import mongoose from "mongoose";

const productionLogSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    quantityProduced: {
      type: Number,
      required: true,
      min: 0.01,
    },
    productionDate: {
      type: Date,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const ProductionLog = mongoose.model("ProductionLog", productionLogSchema);

export default ProductionLog;
