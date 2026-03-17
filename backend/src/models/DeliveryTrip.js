import mongoose from "mongoose";

const deliveryTripSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    tripNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    deliveredQuantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    materialName: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    truck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_TRANSIT", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    dispatchedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

deliveryTripSchema.index({ order: 1, tripNumber: 1 }, { unique: true });

const DeliveryTrip = mongoose.model("DeliveryTrip", deliveryTripSchema);

export default DeliveryTrip;
