import Truck from "../models/Truck.js";
import DeliveryTrip from "../models/DeliveryTrip.js";

export const getTrucks = async (_req, res) => {
  try {
    const trucks = await Truck.find().sort({ createdAt: -1 });
    return res.json({ trucks });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch trucks",
      error: err.message,
    });
  }
};

export const createTruck = async (req, res) => {
  const { name, plateNumber, capacity, note } = req.body;
  const parsedCapacity = Number(capacity || 0);

  if (!name?.trim() || !plateNumber?.trim()) {
    return res.status(400).json({
      message: "Please provide truck name and plate number",
    });
  }

  if (Number.isNaN(parsedCapacity) || parsedCapacity < 0) {
    return res.status(400).json({
      message: "capacity must be a valid non-negative number",
    });
  }

  try {
    const truck = await Truck.create({
      name: name.trim(),
      plateNumber: plateNumber.trim().toUpperCase(),
      capacity: parsedCapacity,
      note: note?.trim() || "",
    });

    return res.status(201).json({
      truck,
      message: "Truck created successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A truck with this plate number already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create truck",
      error: err.message,
    });
  }
};

export const updateTruck = async (req, res) => {
  const { id } = req.params;
  const { name, plateNumber, capacity, note, isActive } = req.body;

  const updateData = {};

  if (name !== undefined) {
    if (!name?.trim()) {
      return res.status(400).json({
        message: "Truck name cannot be empty",
      });
    }
    updateData.name = name.trim();
  }

  if (plateNumber !== undefined) {
    if (!plateNumber?.trim()) {
      return res.status(400).json({
        message: "Plate number cannot be empty",
      });
    }
    updateData.plateNumber = plateNumber.trim().toUpperCase();
  }

  if (capacity !== undefined) {
    const parsedCapacity = Number(capacity);
    if (Number.isNaN(parsedCapacity) || parsedCapacity < 0) {
      return res.status(400).json({
        message: "capacity must be a valid non-negative number",
      });
    }
    updateData.capacity = parsedCapacity;
  }

  if (note !== undefined) {
    updateData.note = note?.trim() || "";
  }

  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
  }

  try {
    const truck = await Truck.findById(id);
    if (!truck) {
      return res.status(404).json({
        message: "Truck not found",
      });
    }

    const activeTrip = await DeliveryTrip.findOne({
      truck: id,
      status: { $in: ["PENDING", "IN_TRANSIT"] },
    });

    if (activeTrip) {
      return res.status(400).json({
        message: `Cannot edit truck while assigned to active Trip #${activeTrip.tripNumber}`,
      });
    }

    const updatedTruck = await Truck.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.json({
      truck: updatedTruck,
      message: "Truck updated successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A truck with this plate number already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update truck",
      error: err.message,
    });
  }
};

export const deleteTruck = async (req, res) => {
  const { id } = req.params;

  try {
    const truck = await Truck.findById(id);
    if (!truck) {
      return res.status(404).json({
        message: "Truck not found",
      });
    }

    const activeTrip = await DeliveryTrip.findOne({
      truck: id,
      status: { $in: ["PENDING", "IN_TRANSIT"] },
    });

    if (activeTrip) {
      return res.status(400).json({
        message: `Cannot delete truck while assigned to active Trip #${activeTrip.tripNumber}`,
      });
    }

    await Truck.findByIdAndDelete(id);

    return res.json({
      message: "Truck deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to delete truck",
      error: err.message,
    });
  }
};
