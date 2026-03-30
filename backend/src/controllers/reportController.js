import Material from "../models/Material.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import DeliveryTrip from "../models/DeliveryTrip.js";

const round = (value) => Number(Number(value || 0).toFixed(2));

export const getReportSummary = async (_req, res) => {
  try {
    const [orders, materials, payments, trips] = await Promise.all([
      Order.find(),
      Material.find(),
      Payment.find(),
      DeliveryTrip.find(),
    ]);

    const completedPayments = payments.filter((payment) =>
      ["COMPLETE", "PARTIAL_REFUND"].includes(payment.status)
    );
    const paidAmount = round(completedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0));
    const stockTotal = round(materials.reduce((sum, material) => sum + Number(material.stock || 0), 0));
    const deliveredTrips = trips.filter((trip) => trip.status === "DELIVERED");
    const inTransitTrips = trips.filter((trip) => trip.status === "IN_TRANSIT");

    return res.json({
      sales: {
        totalRevenue: paidAmount,
        totalOrders: orders.length,
        approvedOrders: orders.filter((order) => order.orderStatus === "APPROVED").length,
        pendingOrders: orders.filter((order) => order.orderStatus === "PENDING").length,
      },
      stock: {
        totalMaterials: materials.length,
        activeMaterials: materials.filter((material) => material.isActive !== false).length,
        totalStock: stockTotal,
        lowStockMaterials: materials.filter((material) => Number(material.stock || 0) <= 20).length,
      },
      payments: {
        totalTransactions: payments.length,
        completePayments: completedPayments.length,
        pendingPayments: payments.filter((payment) => payment.status === "PENDING").length,
        outstandingOrders: orders.filter((order) => order.paymentStatus !== "PAID").length,
      },
      delivery: {
        totalTrips: trips.length,
        deliveredTrips: deliveredTrips.length,
        inTransitTrips: inTransitTrips.length,
        deliveredOrders: orders.filter((order) => order.deliveryStatus === "DELIVERED").length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to load report summary",
    });
  }
};
