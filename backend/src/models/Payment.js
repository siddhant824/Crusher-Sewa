import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    contractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["ESEWA", "MANUAL"],
      default: "ESEWA",
      required: true,
    },
    productCode: {
      type: String,
      trim: true,
      default: "",
    },
    transactionUuid: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    providerTransactionId: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: [
        "INITIATED",
        "PENDING",
        "COMPLETE",
        "FAILED",
        "CANCELED",
        "NOT_FOUND",
        "AMBIGUOUS",
        "FULL_REFUND",
        "PARTIAL_REFUND",
      ],
      default: "INITIATED",
      index: true,
    },
    successUrl: {
      type: String,
      trim: true,
      default: "",
    },
    failureUrl: {
      type: String,
      trim: true,
      default: "",
    },
    rawInitiationPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rawCallbackPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rawVerificationResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    callbackSignatureValid: {
      type: Boolean,
      default: null,
    },
    lastCheckedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

paymentSchema.index({ order: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, transactionUuid: 1 }, { unique: true });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
