import Material from "../models/Material.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import DeliveryTrip from "../models/DeliveryTrip.js";

const round = (value) => Number(Number(value || 0).toFixed(2));

const getDateRangeFilter = (req) => {
  const { startDate = "", endDate = "" } = req.query;
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

  return {
    start: start && !Number.isNaN(start.getTime()) ? start : null,
    end: end && !Number.isNaN(end.getTime()) ? end : null,
  };
};

const isWithinRange = (value, range) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }

  if (range.start && date < range.start) {
    return false;
  }

  if (range.end && date > range.end) {
    return false;
  }

  return true;
};

export const getReportSummary = async (req, res) => {
  try {
    const [orders, materials, payments, trips] = await Promise.all([
      Order.find(),
      Material.find(),
      Payment.find(),
      DeliveryTrip.find(),
    ]);
    const range = getDateRangeFilter(req);

    const completedPayments = payments.filter((payment) =>
      ["COMPLETE", "PARTIAL_REFUND"].includes(payment.status)
    );
    const rangedOrders = range.start || range.end
      ? orders.filter((order) => isWithinRange(order.createdAt, range))
      : orders;
    const rangedPayments = range.start || range.end
      ? payments.filter((payment) => isWithinRange(payment.createdAt, range))
      : payments;
    const rangedTrips = range.start || range.end
      ? trips.filter((trip) => isWithinRange(trip.createdAt, range))
      : trips;
    const rangedCompletedPayments = rangedPayments.filter((payment) =>
      ["COMPLETE", "PARTIAL_REFUND"].includes(payment.status)
    );

    const paidAmount = round(
      rangedCompletedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    );
    const stockTotal = round(materials.reduce((sum, material) => sum + Number(material.stock || 0), 0));
    const deliveredTrips = rangedTrips.filter((trip) => trip.status === "DELIVERED");
    const inTransitTrips = rangedTrips.filter((trip) => trip.status === "IN_TRANSIT");
    const unpaidOrders = rangedOrders.filter((order) => order.paymentStatus === "UNPAID");
    const partialOrders = rangedOrders.filter((order) => order.paymentStatus === "PARTIAL");
    const partialPaymentTotal = round(
      rangedCompletedPayments
        .filter((payment) =>
          partialOrders.some((order) => String(order._id) === String(payment.order))
        )
        .reduce((sum, payment) => sum + Number(payment.amount), 0)
    );
    const unpaidAmountTotal = round(
      unpaidOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    );

    const monthlySummaryMap = new Map();
    rangedCompletedPayments.forEach((payment) => {
      const date = new Date(payment.createdAt);
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const current = monthlySummaryMap.get(monthKey) || {
        month: monthKey,
        label: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
        revenue: 0,
        transactions: 0,
      };
      current.revenue += Number(payment.amount);
      current.transactions += 1;
      monthlySummaryMap.set(monthKey, current);
    });

    const topMaterialMap = new Map();
    rangedOrders
      .filter((order) => order.orderStatus === "APPROVED")
      .forEach((order) => {
        order.items.forEach((item) => {
          const key = item.materialName;
          const current = topMaterialMap.get(key) || {
            materialName: item.materialName,
            unit: item.unit,
            totalQuantity: 0,
            totalRevenue: 0,
          };
          current.totalQuantity += Number(item.quantity);
          current.totalRevenue += Number(item.subtotal);
          topMaterialMap.set(key, current);
        });
      });

    return res.json({
      sales: {
        totalRevenue: paidAmount,
        totalOrders: rangedOrders.length,
        approvedOrders: rangedOrders.filter((order) => order.orderStatus === "APPROVED").length,
        pendingOrders: rangedOrders.filter((order) => order.orderStatus === "PENDING").length,
      },
      stock: {
        totalMaterials: materials.length,
        activeMaterials: materials.filter((material) => material.isActive !== false).length,
        totalStock: stockTotal,
        lowStockMaterials: materials.filter((material) => Number(material.stock || 0) <= 20).length,
      },
      payments: {
        totalTransactions: rangedPayments.length,
        completePayments: rangedCompletedPayments.length,
        pendingPayments: rangedPayments.filter((payment) => payment.status === "PENDING").length,
        outstandingOrders: rangedOrders.filter((order) => order.paymentStatus !== "PAID").length,
        unpaidAmountTotal,
        partialPaymentTotal,
      },
      delivery: {
        totalTrips: rangedTrips.length,
        deliveredTrips: deliveredTrips.length,
        inTransitTrips: inTransitTrips.length,
        deliveredOrders: rangedOrders.filter((order) => order.deliveryStatus === "DELIVERED").length,
      },
      monthlySummary: Array.from(monthlySummaryMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((item) => ({
          ...item,
          revenue: round(item.revenue),
        })),
      topSellingMaterials: Array.from(topMaterialMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5)
        .map((item) => ({
          ...item,
          totalQuantity: round(item.totalQuantity),
          totalRevenue: round(item.totalRevenue),
        })),
      dateRange: {
        startDate: req.query.startDate || "",
        endDate: req.query.endDate || "",
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to load report summary",
    });
  }
};
