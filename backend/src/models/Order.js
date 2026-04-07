import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
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
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    ratePerCuMetre: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "At least one order item is required",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    deliveryStatus: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "PARTIALLY_DELIVERED", "DELIVERED"],
      default: "PENDING",
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID"],
      default: "UNPAID",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: "",
    },
    notificationMeta: {
      approvalEmailSentAt: {
        type: Date,
      },
      deliveryEmailSentAt: {
        type: Date,
      },
      lastDeliveryEmailStatus: {
        type: String,
        enum: ["PENDING", "IN_PROGRESS", "PARTIALLY_DELIVERED", "DELIVERED", null],
        default: null,
      },
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
