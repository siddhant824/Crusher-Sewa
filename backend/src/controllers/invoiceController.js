import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import { populateOrderWithDeliveriesQuery, attachDeliveryTripsToOrders } from "../services/deliveryService.js";

const invoicePopulate = [
  {
    path: "order",
    populate: populateOrderWithDeliveriesQuery,
  },
  {
    path: "contractor",
    select: "name email",
  },
  {
    path: "generatedBy",
    select: "name email role",
  },
];

const generateInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();
  return `INV-${String(count + 1).padStart(5, "0")}`;
};

const canAccessInvoice = (invoice, user) =>
  user.role !== "CONTRACTOR" ||
  String(invoice.contractor?._id || invoice.contractor) === String(user._id);

const enrichInvoice = async (invoiceDoc) => {
  const populated = await Invoice.findById(invoiceDoc._id).populate(invoicePopulate);
  if (!populated) {
    return null;
  }

  const invoice = populated.toObject();
  invoice.order = await attachDeliveryTripsToOrders(invoice.order);
  return invoice;
};

export const generateInvoice = async (req, res) => {
  const { orderId, note = "" } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== "APPROVED") {
      return res.status(400).json({ message: "Only approved orders can have invoices" });
    }

    let invoice = await Invoice.findOne({ order: order._id });

    if (!invoice) {
      invoice = await Invoice.create({
        order: order._id,
        contractor: order.contractor,
        invoiceNumber: await generateInvoiceNumber(),
        generatedBy: req.user._id,
        subtotalAmount: Number(order.totalAmount),
        totalAmount: Number(order.totalAmount),
        note: note.trim(),
      });
    } else if (note.trim()) {
      invoice.note = note.trim();
      await invoice.save();
    }

    const enrichedInvoice = await enrichInvoice(invoice);

    return res.status(201).json({
      message: "Invoice generated successfully",
      invoice: enrichedInvoice,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to generate invoice",
    });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const query = req.user.role === "CONTRACTOR" ? { contractor: req.user._id } : {};
    const invoices = await Invoice.find(query).populate(invoicePopulate).sort({ createdAt: -1 });
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoiceDoc) => {
        const invoice = invoiceDoc.toObject();
        invoice.order = await attachDeliveryTripsToOrders(invoice.order);
        return invoice;
      })
    );

    return res.json({ invoices: enrichedInvoices });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch invoices",
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(invoicePopulate);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!canAccessInvoice(invoice, req.user)) {
      return res.status(403).json({ message: "You can only access your own invoices" });
    }

    const enrichedInvoice = await enrichInvoice(invoice);
    return res.json({ invoice: enrichedInvoice });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch invoice",
    });
  }
};
