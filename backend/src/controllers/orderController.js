import Material from "../models/Material.js";
import Order from "../models/Order.js";

const populateOrderQuery = [
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

    const populatedOrder = await Order.findById(order._id).populate(populateOrderQuery);

    return res.status(201).json({
      order: populatedOrder,
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
      .populate(populateOrderQuery)
      .sort({ createdAt: -1 });

    return res.json({ orders });
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
      .populate(populateOrderQuery)
      .sort({ createdAt: -1 });

    return res.json({ orders });
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

    const stockAdjustments = [];

    if (orderStatus === "APPROVED") {
      for (const item of order.items) {
        const updatedMaterial = await Material.findOneAndUpdate(
          {
            _id: item.material,
            stock: { $gte: item.quantity },
          },
          {
            $inc: { stock: -item.quantity },
          },
          {
            new: true,
          }
        );

        if (!updatedMaterial) {
          for (const adjustment of stockAdjustments) {
            await Material.findByIdAndUpdate(adjustment.materialId, {
              $inc: { stock: adjustment.quantity },
            });
          }

          return res.status(400).json({
            message: `Insufficient stock to approve ${item.materialName}`,
          });
        }

        stockAdjustments.push({
          materialId: item.material,
          quantity: item.quantity,
        });
      }
    }

    order.orderStatus = orderStatus;
    order.reviewNote = reviewNote?.trim() || "";
    order.approvedBy = req.user._id;
    order.approvedAt = new Date();
    await order.save();

    const populatedOrder = await Order.findById(order._id).populate(populateOrderQuery);

    return res.json({
      order: populatedOrder,
      message: `Order ${orderStatus.toLowerCase()} successfully`,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update order status",
      error: err.message,
    });
  }
};
