import DeliveryTrip from "../models/DeliveryTrip.js";
import Order from "../models/Order.js";

export const populateDeliveryTripQuery = [
  {
    path: "material",
    select: "name unit",
  },
  {
    path: "truck",
    select: "name plateNumber capacity isActive",
  },
  {
    path: "assignedBy",
    select: "name email role",
  },
];

export const populateOrderWithDeliveriesQuery = [
  {
    path: "contractor",
    select: "name email",
  },
  {
    path: "approvedBy",
    select: "name email role",
  },
  {
    path: "items.material",
    select: "name unit stock imageUrl ratePerCuMetre",
  },
];

export const getTripsForOrder = async (orderId) => {
  return DeliveryTrip.find({ order: orderId })
    .populate(populateDeliveryTripQuery)
    .sort({ tripNumber: 1, createdAt: 1 });
};

export const attachDeliveryTripsToOrders = async (orders) => {
  const normalizedOrders = Array.isArray(orders) ? orders : [orders];

  const enrichedOrders = await Promise.all(
    normalizedOrders.map(async (orderDoc) => {
      if (!orderDoc) {
        return orderDoc;
      }

      const order = typeof orderDoc.toObject === "function" ? orderDoc.toObject() : orderDoc;
      order.deliveryTrips = await getTripsForOrder(order._id);
      return order;
    })
  );

  return Array.isArray(orders) ? enrichedOrders : enrichedOrders[0];
};

export const refreshOrderDeliveryStatus = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const trips = await DeliveryTrip.find({ order: orderId });
  const activeTrips = trips.filter((trip) => trip.status !== "CANCELLED");

  if (activeTrips.length === 0) {
    order.deliveryStatus = "PENDING";
    await order.save();
    return order;
  }

  const totalOrderedQuantity = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const deliveredQuantity = activeTrips
    .filter((trip) => trip.status === "DELIVERED")
    .reduce((sum, trip) => sum + Number(trip.deliveredQuantity), 0);
  const hasTransitTrip = activeTrips.some((trip) => trip.status === "IN_TRANSIT");

  if (deliveredQuantity >= totalOrderedQuantity && totalOrderedQuantity > 0) {
    order.deliveryStatus = "DELIVERED";
  } else if (deliveredQuantity > 0) {
    order.deliveryStatus = "PARTIALLY_DELIVERED";
  } else if (hasTransitTrip) {
    order.deliveryStatus = "IN_PROGRESS";
  } else {
    order.deliveryStatus = "PENDING";
  }

  await order.save();
  return order;
};

export const getDeliveredQuantityForMaterial = async (orderId, materialId, excludeTripId = null) => {
  const query = {
    order: orderId,
    material: materialId,
    status: "DELIVERED",
  };

  if (excludeTripId) {
    query._id = { $ne: excludeTripId };
  }

  const deliveredTrips = await DeliveryTrip.find(query);
  return deliveredTrips.reduce((sum, trip) => sum + Number(trip.deliveredQuantity), 0);
};

export const getAllocatedQuantityForMaterial = async (orderId, materialId, excludeTripId = null) => {
  const query = {
    order: orderId,
    material: materialId,
  };

  if (excludeTripId) {
    query._id = { $ne: excludeTripId };
  }

  const trips = await DeliveryTrip.find(query);
  return trips
    .filter((trip) => trip.status !== "CANCELLED")
    .reduce((sum, trip) => sum + Number(trip.deliveredQuantity), 0);
};
