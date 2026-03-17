import mongoose from "mongoose";

const truckSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    plateNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
    },
    capacity: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const Truck = mongoose.model("Truck", truckSchema);

export default Truck;
