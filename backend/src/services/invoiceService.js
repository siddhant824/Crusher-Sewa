import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import { attachDeliveryTripsToOrders, populateOrderWithDeliveriesQuery } from "./deliveryService.js";

export const invoicePopulate = [
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

export const generateInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();
  return `INV-${String(count + 1).padStart(5, "0")}`;
};

export const enrichInvoice = async (invoiceDoc) => {
  const populated = await Invoice.findById(invoiceDoc._id).populate(invoicePopulate);
  if (!populated) {
    return null;
  }

  const invoice = populated.toObject();
  invoice.order = await attachDeliveryTripsToOrders(invoice.order);
  return invoice;
};

export const getOrCreateInvoiceForOrder = async ({ orderId, generatedBy, note = "" }) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.orderStatus !== "APPROVED") {
    throw new Error("Only approved orders can have invoices");
  }

  let invoice = await Invoice.findOne({ order: order._id });

  if (!invoice) {
    invoice = await Invoice.create({
      order: order._id,
      contractor: order.contractor,
      invoiceNumber: await generateInvoiceNumber(),
      generatedBy,
      subtotalAmount: Number(order.totalAmount),
      totalAmount: Number(order.totalAmount),
      note: note.trim(),
    });
  } else if (note.trim()) {
    invoice.note = note.trim();
    await invoice.save();
  }

  return enrichInvoice(invoice);
};
