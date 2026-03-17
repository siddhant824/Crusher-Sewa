import Truck from "../models/Truck.js";

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
