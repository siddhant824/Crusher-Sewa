import Invoice from "../models/Invoice.js";
import { attachDeliveryTripsToOrders } from "../services/deliveryService.js";
import { enrichInvoice, getOrCreateInvoiceForOrder, invoicePopulate } from "../services/invoiceService.js";

const canAccessInvoice = (invoice, user) =>
  user.role !== "CONTRACTOR" ||
  String(invoice.contractor?._id || invoice.contractor) === String(user._id);

export const generateInvoice = async (req, res) => {
  const { orderId, note = "" } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  try {
    const enrichedInvoice = await getOrCreateInvoiceForOrder({
      orderId,
      generatedBy: req.user._id,
      note,
    });

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
