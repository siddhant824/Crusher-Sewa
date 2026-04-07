import nodemailer from "nodemailer";
import Order from "../models/Order.js";
import { populateOrderWithDeliveriesQuery, attachDeliveryTripsToOrders } from "./deliveryService.js";
import { buildInvoicePdfBuffer } from "./invoicePdfService.js";

let transporterCache = null;
let configWarningShown = false;

const getOptionalEnv = (name) => process.env[name]?.trim() || "";

const getMailConfig = () => {
  const host = getOptionalEnv("SMTP_HOST");
  const port = Number(getOptionalEnv("SMTP_PORT") || 0);
  const user = getOptionalEnv("SMTP_USER");
  const pass = getOptionalEnv("SMTP_PASS");
  const fromEmail = getOptionalEnv("SMTP_FROM_EMAIL");
  const fromName = getOptionalEnv("SMTP_FROM_NAME") || "Crusher Sewa";

  const ready = Boolean(host && port > 0 && fromEmail);

  return {
    ready,
    host,
    port,
    secure: getOptionalEnv("SMTP_SECURE").toLowerCase() === "true",
    user,
    pass,
    fromEmail,
    fromName,
  };
};

const getTransporter = () => {
  const config = getMailConfig();

  if (!config.ready) {
    if (!configWarningShown) {
      console.warn("Email notifications skipped because SMTP configuration is incomplete.");
      configWarningShown = true;
    }
    return null;
  }

  if (!transporterCache) {
    transporterCache = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.pass
          ? {
              user: config.user,
              pass: config.pass,
            }
          : undefined,
    });
  }

  return transporterCache;
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const getFrontendOrderUrl = (orderId) => {
  const base = getOptionalEnv("FRONTEND_URL");
  if (!base) {
    return "";
  }

  try {
    return new URL(`/contractor/orders?order=${orderId}`, base).toString();
  } catch {
    return "";
  }
};

const getFrontendInvoiceUrl = (invoiceId) => {
  const base = getOptionalEnv("FRONTEND_URL");
  if (!base) {
    return "";
  }

  try {
    return new URL(`/contractor/invoices/${invoiceId}`, base).toString();
  } catch {
    return "";
  }
};

const buildItemsRows = (items = []) =>
  items
    .map(
      (item, index) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${index + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${item.materialName}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${item.quantity} ${item.unit}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${formatCurrency(item.ratePerCuMetre)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;text-align:right;">${formatCurrency(item.subtotal)}</td>
        </tr>
      `
    )
    .join("");

const buildBaseEmailLayout = ({ title, intro, body, actionLabel = "", actionUrl = "" }) => `
  <div style="background:#f5f5f4;padding:32px 16px;font-family:Arial,sans-serif;color:#1c1917;">
    <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:18px;overflow:hidden;">
      <div style="background:#0f766e;padding:28px 32px;color:#ffffff;">
        <div style="font-size:14px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.9;">Crusher Sewa</div>
        <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">${title}</h1>
      </div>
      <div style="padding:28px 32px;">
        <p style="margin:0 0 12px;font-size:16px;line-height:1.7;">${intro}</p>
        <div style="font-size:14px;line-height:1.8;color:#57534e;">${body}</div>
        ${
          actionUrl
            ? `<div style="margin-top:24px;">
                <a href="${actionUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">${actionLabel}</a>
              </div>`
            : ""
        }
      </div>
    </div>
  </div>
`;

export const getOrderForNotification = async (orderId) => {
  const orderDoc = await Order.findById(orderId).populate(populateOrderWithDeliveriesQuery);
  if (!orderDoc) {
    return null;
  }

  return attachDeliveryTripsToOrders(orderDoc);
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const transporter = getTransporter();
  const config = getMailConfig();

  if (!transporter) {
    return false;
  }

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject,
    html,
    attachments,
  });

  return true;
};

export const sendOrderApprovalEmail = async (order) => {
  const contractor = order?.contractor;
  if (!contractor?.email) {
    return false;
  }

  const subject = `Order Approved - ${formatCurrency(order.totalAmount)}`;
  const orderUrl = getFrontendOrderUrl(order._id);
  const html = buildBaseEmailLayout({
    title: "Your order has been approved",
    intro: `Hello ${contractor.name}, your order has been approved and is now ready for delivery planning.`,
    actionLabel: "View Order",
    actionUrl: orderUrl,
    body: `
      <p style="margin:0 0 16px;">Order total: <strong>${formatCurrency(order.totalAmount)}</strong></p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;">
        <thead style="background:#f5f5f4;text-align:left;">
          <tr>
            <th style="padding:10px 12px;">#</th>
            <th style="padding:10px 12px;">Material</th>
            <th style="padding:10px 12px;">Qty</th>
            <th style="padding:10px 12px;">Rate</th>
            <th style="padding:10px 12px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${buildItemsRows(order.items)}</tbody>
      </table>
    `,
  });

  return sendEmail({
    to: contractor.email,
    subject,
    html,
  });
};

export const sendDeliveryUpdateEmail = async (order, previousStatus = "") => {
  const contractor = order?.contractor;
  if (!contractor?.email) {
    return false;
  }

  const subject = `Delivery Update - ${order.deliveryStatus}`;
  const orderUrl = getFrontendOrderUrl(order._id);
  const tripCount = order.deliveryTrips?.length || 0;
  const html = buildBaseEmailLayout({
    title: "Your delivery status has changed",
    intro: `Hello ${contractor.name}, your order delivery moved from ${previousStatus || "PENDING"} to ${order.deliveryStatus}.`,
    actionLabel: "Track Delivery",
    actionUrl: orderUrl,
    body: `
      <p style="margin:0 0 16px;">Total order amount: <strong>${formatCurrency(order.totalAmount)}</strong></p>
      <p style="margin:0 0 16px;">Trip count so far: <strong>${tripCount}</strong></p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;">
        <thead style="background:#f5f5f4;text-align:left;">
          <tr>
            <th style="padding:10px 12px;">Trip</th>
            <th style="padding:10px 12px;">Material</th>
            <th style="padding:10px 12px;">Truck</th>
            <th style="padding:10px 12px;">Qty</th>
            <th style="padding:10px 12px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${(order.deliveryTrips || [])
            .map(
              (trip) => `
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">Trip #${trip.tripNumber}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${trip.materialName}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${trip.truck?.name || "-"} (${trip.truck?.plateNumber || "-"})</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${trip.deliveredQuantity} ${trip.unit}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e7e5e4;">${trip.status}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `,
  });

  return sendEmail({
    to: contractor.email,
    subject,
    html,
  });
};

export const sendPaymentSuccessEmail = async ({ order, payment, invoice }) => {
  const contractor = order?.contractor || invoice?.contractor;
  if (!contractor?.email) {
    return false;
  }

  const invoiceUrl = invoice?._id ? getFrontendInvoiceUrl(invoice._id) : getFrontendOrderUrl(order._id);
  const subject = `Payment Successful - ${formatCurrency(payment.amount)}`;
  const html = buildBaseEmailLayout({
    title: "Your payment was successful",
    intro: `Hello ${contractor.name}, we received your payment of ${formatCurrency(payment.amount)} for your Crusher Sewa order.`,
    actionLabel: invoice?._id ? "Open Invoice" : "View Order",
    actionUrl: invoiceUrl,
    body: `
      <p style="margin:0 0 12px;">Order total: <strong>${formatCurrency(order.totalAmount)}</strong></p>
      <p style="margin:0 0 12px;">Payment status: <strong>${order.paymentStatus}</strong></p>
      <p style="margin:0 0 12px;">Method of payment: <strong>${payment.provider === "MANUAL" ? "Cash" : payment.provider}</strong></p>
      <p style="margin:0 0 16px;">Invoice: <strong>${invoice?.invoiceNumber || "Generated with this payment"}</strong></p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;">
        <thead style="background:#f5f5f4;text-align:left;">
          <tr>
            <th style="padding:10px 12px;">#</th>
            <th style="padding:10px 12px;">Material</th>
            <th style="padding:10px 12px;">Qty</th>
            <th style="padding:10px 12px;">Rate</th>
            <th style="padding:10px 12px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${buildItemsRows(order.items)}</tbody>
      </table>
    `,
  });

  const attachments = invoice
    ? [
        {
          filename: `${invoice.invoiceNumber || "invoice"}.pdf`,
          content: buildInvoicePdfBuffer(invoice),
          contentType: "application/pdf",
        },
      ]
    : [];

  return sendEmail({
    to: contractor.email,
    subject,
    html,
    attachments,
  });
};
