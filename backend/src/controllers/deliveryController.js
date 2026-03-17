import DeliveryTrip from "../models/DeliveryTrip.js";
import Order from "../models/Order.js";
import Truck from "../models/Truck.js";
import {
  getAllocatedQuantityForMaterial,
  attachDeliveryTripsToOrders,
  getTripsForOrder,
  populateOrderWithDeliveriesQuery,
  refreshOrderDeliveryStatus,
} from "../services/deliveryService.js";

const getBusyTruckTrip = async (truckId, excludeTripId = null) => {
  const query = {
    truck: truckId,
    status: { $nin: ["DELIVERED", "CANCELLED"] },
  };

  if (excludeTripId) {
    query._id = { $ne: excludeTripId };
  }

  return DeliveryTrip.findOne(query);
};

export const createDeliveryTrip = async (req, res) => {
  const {
    orderId,
    materialId,
    deliveredQuantity,
    truckId,
    status,
    note,
  } = req.body;
  const quantity = Number(deliveredQuantity);

  if (!orderId || !materialId || !truckId || Number.isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: "Please provide a valid order, material, truck, and delivered quantity",
    });
  }

  if (!["PENDING", "IN_TRANSIT", "DELIVERED", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      message: "status must be PENDING, IN_TRANSIT, DELIVERED, or CANCELLED",
    });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== "APPROVED") {
      return res.status(400).json({
        message: "Delivery trips can only be created for approved orders",
      });
    }

    const orderItem = order.items.find(
      (item) => String(item.material) === String(materialId)
    );
    if (!orderItem) {
      return res.status(400).json({
        message: "Selected material does not belong to this order",
      });
    }

    const truck = await Truck.findById(truckId);
    if (!truck || !truck.isActive) {
      return res.status(400).json({
        message: "Please select an active truck for the trip",
      });
    }

    if (truck.capacity > 0 && quantity > truck.capacity) {
      return res.status(400).json({
        message: `Trip quantity exceeds truck capacity of ${truck.capacity}`,
      });
    }

    const busyTrip = await getBusyTruckTrip(truckId);
    if (busyTrip) {
      return res.status(400).json({
        message: `Truck is already busy on Trip #${busyTrip.tripNumber}`,
      });
    }

    const existingTrips = await DeliveryTrip.find({ order: orderId });
    const nextTripNumber = existingTrips.length + 1;
    const allocatedSoFar = await getAllocatedQuantityForMaterial(orderId, materialId);

    if (allocatedSoFar + quantity > Number(orderItem.quantity)) {
      return res.status(400).json({
        message: `Assigned quantity for ${orderItem.materialName} exceeds ordered quantity`,
      });
    }

    const deliveryTrip = await DeliveryTrip.create({
      order: orderId,
      tripNumber: nextTripNumber,
      deliveredQuantity: quantity,
      material: materialId,
      materialName: orderItem.materialName,
      unit: orderItem.unit,
      truck: truckId,
      status,
      note: note?.trim() || "",
      dispatchedAt: status === "IN_TRANSIT" || status === "DELIVERED" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
      assignedBy: req.user._id,
    });

    await refreshOrderDeliveryStatus(orderId);

    const populatedOrder = await Order.findById(orderId).populate(populateOrderWithDeliveriesQuery);
    const orderWithTrips = await attachDeliveryTripsToOrders(populatedOrder);

    return res.status(201).json({
      deliveryTrip,
      order: orderWithTrips,
      message: "Delivery trip created successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Trip number already exists for this order" });
    }

    return res.status(500).json({
      message: "Failed to create delivery trip",
      error: err.message,
    });
  }
};

export const updateDeliveryTrip = async (req, res) => {
  const { id } = req.params;
  const {
    deliveredQuantity,
    truckId,
    status,
    note,
  } = req.body;

  if (status && !["PENDING", "IN_TRANSIT", "DELIVERED", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      message: "status must be PENDING, IN_TRANSIT, DELIVERED, or CANCELLED",
    });
  }

  try {
    const trip = await DeliveryTrip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Delivery trip not found" });
    }

    const order = await Order.findById(trip.order);
    if (!order) {
      return res.status(404).json({ message: "Related order not found" });
    }

    const orderItem = order.items.find(
      (item) => String(item.material) === String(trip.material)
    );

    if (!orderItem) {
      return res.status(400).json({
        message: "Trip material does not exist on the related order",
      });
    }

    let nextQuantity = trip.deliveredQuantity;
    let nextTruckId = trip.truck;
    const nextStatus = status || trip.status;

    if (deliveredQuantity !== undefined) {
      const quantity = Number(deliveredQuantity);
      if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "deliveredQuantity must be a positive number" });
      }
      nextQuantity = quantity;
      trip.deliveredQuantity = quantity;
    }

    if (truckId) {
      const truck = await Truck.findById(truckId);
      if (!truck || !truck.isActive) {
        return res.status(400).json({
          message: "Please select an active truck for the trip",
        });
      }
      nextTruckId = truckId;
      trip.truck = truckId;
    }

    const effectiveTruck = await Truck.findById(nextTruckId);
    if (!effectiveTruck || !effectiveTruck.isActive) {
      return res.status(400).json({
        message: "Please select an active truck for the trip",
      });
    }

    if (effectiveTruck.capacity > 0 && Number(nextQuantity) > effectiveTruck.capacity) {
      return res.status(400).json({
        message: `Trip quantity exceeds truck capacity of ${effectiveTruck.capacity}`,
      });
    }

    if (nextStatus !== "DELIVERED" && nextStatus !== "CANCELLED") {
      const busyTrip = await getBusyTruckTrip(nextTruckId, trip._id);
      if (busyTrip) {
        return res.status(400).json({
          message: `Truck is already busy on Trip #${busyTrip.tripNumber}`,
        });
      }
    }

    if (
      nextStatus !== "CANCELLED" &&
      (await getAllocatedQuantityForMaterial(trip.order, trip.material, trip._id)) +
        Number(nextQuantity) >
        Number(orderItem.quantity)
    ) {
      return res.status(400).json({
        message: `Assigned quantity for ${trip.materialName} exceeds ordered quantity`,
      });
    }

    if (note !== undefined) {
      trip.note = note?.trim() || "";
    }

    if (status) {
      trip.status = status;

      if (status === "IN_TRANSIT" && !trip.dispatchedAt) {
        trip.dispatchedAt = new Date();
      }

      if (status === "DELIVERED") {
        if (!trip.dispatchedAt) {
          trip.dispatchedAt = new Date();
        }
        if (!trip.deliveredAt) {
          trip.deliveredAt = new Date();
        }
      }
    }

    await trip.save();
    await refreshOrderDeliveryStatus(trip.order);

    const populatedOrder = await Order.findById(trip.order).populate(populateOrderWithDeliveriesQuery);
    const orderWithTrips = await attachDeliveryTripsToOrders(populatedOrder);

    return res.json({
      deliveryTrip: trip,
      order: orderWithTrips,
      message: "Delivery trip updated successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update delivery trip",
      error: err.message,
    });
  }
};

export const getDeliveryTripsForOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId).populate(populateOrderWithDeliveriesQuery);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (req.user.role === "CONTRACTOR" && String(order.contractor?._id || order.contractor) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only view delivery trips for your own orders" });
    }

    const trips = await getTripsForOrder(orderId);

    return res.json({ trips });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch delivery trips",
      error: err.message,
    });
  }
};
