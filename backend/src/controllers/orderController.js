import Material from "../models/Material.js";
import Order from "../models/Order.js";
import { applyStockChange } from "../services/stockService.js";
import {
  attachDeliveryTripsToOrders,
  populateOrderWithDeliveriesQuery,
  refreshOrderDeliveryStatus,
} from "../services/deliveryService.js";
import { sendOrderApprovalEmail } from "../services/notificationService.js";

export const createOrder = async (req, res) => {
  const { items } = req.body;

  if (req.user.role !== "CONTRACTOR") {
    return res.status(403).json({ message: "Only contractors can place orders" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Please add at least one material to the order" });
  }

  try {
    const normalizedItems = [];

    for (const item of items) {
      const materialId = item?.materialId;
      const quantity = Number(item?.quantity);

      if (!materialId || Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "Each order item must include a valid material and quantity",
        });
      }

      const material = await Material.findById(materialId);
      if (!material) {
        return res.status(404).json({ message: "One of the selected materials was not found" });
      }

      if (material.stock <= 0) {
        return res.status(400).json({
          message: `${material.name} is currently out of stock`,
        });
      }

      if (quantity > material.stock) {
        return res.status(400).json({
          message: `Requested quantity for ${material.name} exceeds available stock`,
        });
      }

      const subtotal = Number((quantity * material.ratePerCuMetre).toFixed(2));

      normalizedItems.push({
        material: material._id,
        materialName: material.name,
        unit: material.unit,
        quantity,
        ratePerCuMetre: material.ratePerCuMetre,
        subtotal,
      });
    }

    const totalAmount = Number(
      normalizedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
    );

    const order = await Order.create({
      contractor: req.user._id,
      items: normalizedItems,
      totalAmount,
    });

    const populatedOrder = await Order.findById(order._id).populate(populateOrderWithDeliveriesQuery);
    const orderWithTrips = await attachDeliveryTripsToOrders(populatedOrder);

    return res.status(201).json({
      order: orderWithTrips,
      message: "Order placed successfully and is awaiting approval",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to place order",
      error: err.message,
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ contractor: req.user._id })
      .populate(populateOrderWithDeliveriesQuery)
      .sort({ createdAt: -1 });

    const ordersWithTrips = await attachDeliveryTripsToOrders(orders);

    return res.json({ orders: ordersWithTrips });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch your orders",
      error: err.message,
    });
  }
};

export const getAllOrders = async (_req, res) => {
  try {
    const orders = await Order.find()
      .populate(populateOrderWithDeliveriesQuery)
      .sort({ createdAt: -1 });

    const ordersWithTrips = await attachDeliveryTripsToOrders(orders);

    return res.json({ orders: ordersWithTrips });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch orders",
      error: err.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { orderStatus, reviewNote } = req.body;

  if (!["APPROVED", "REJECTED"].includes(orderStatus)) {
    return res.status(400).json({
      message: "orderStatus must be either APPROVED or REJECTED",
    });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== "PENDING") {
      return res.status(400).json({
        message: "Only pending orders can be reviewed",
      });
    }

    if (orderStatus === "APPROVED") {
      for (const item of order.items) {
        const material = await Material.findById(item.material);
        if (!material || material.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock to approve ${item.materialName}`,
          });
        }
      }

      for (const item of order.items) {
        try {
          await applyStockChange({
            materialId: item.material,
            quantityChange: -item.quantity,
            changeType: "ORDER_APPROVAL",
            note: `Stock deducted for approved order ${order._id} (${item.materialName})`,
            updatedBy: req.user._id,
          });
        } catch (stockErr) {
          return res.status(400).json({
            message: stockErr.message || `Insufficient stock to approve ${item.materialName}`,
          });
        }
      }
    }

    order.orderStatus = orderStatus;
    order.reviewNote = reviewNote?.trim() || "";
    order.approvedBy = req.user._id;
    order.approvedAt = new Date();
    await order.save();
    await refreshOrderDeliveryStatus(order._id);

    const populatedOrder = await Order.findById(order._id).populate(populateOrderWithDeliveriesQuery);
    const orderWithTrips = await attachDeliveryTripsToOrders(populatedOrder);

    if (orderStatus === "APPROVED" && !order.notificationMeta?.approvalEmailSentAt) {
      try {
        const sent = await sendOrderApprovalEmail(orderWithTrips);
        if (sent) {
          await Order.findByIdAndUpdate(order._id, {
            $set: {
              "notificationMeta.approvalEmailSentAt": new Date(),
            },
          });
        }
      } catch (emailErr) {
        console.error("Failed to send order approval email:", emailErr.message);
      }
    }

    return res.json({
      order: orderWithTrips,
      message: `Order ${orderStatus.toLowerCase()} successfully`,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update order status",
      error: err.message,
    });
  }
};
