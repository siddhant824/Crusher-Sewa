import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth.js";
import { getReportSummary } from "../services/reportsApi.js";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (value) => new Intl.NumberFormat("en-NP").format(Number(value || 0));

const actions = [
  {
    title: "Manage Materials",
    desc: "Update pricing, units, and active material records.",
    path: "/manager/materials",
  },
  {
    title: "Stock Control",
    desc: "Post production logs and manual stock adjustments.",
    path: "/manager/stock",
  },
  {
    title: "Delivery Desk",
    desc: "Assign trips and monitor dispatch progress.",
    path: "/manager/delivery",
  },
  {
    title: "Order Review",
    desc: "Process pending order approvals quickly.",
    path: "/manager/orders",
  },
  {
    title: "Payments",
    desc: "Track online and manual collection activity.",
    path: "/manager/payments",
  },
  {
    title: "Invoices",
    desc: "Generate and review customer invoices.",
    path: "/manager/invoices",
  },
];

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getReportSummary();
        setSummary(data);
      } catch (err) {
        toast.error(err.message || "Failed to load dashboard summary");
      }
    };

    fetchSummary();
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Total Orders",
        value: summary ? formatNumber(summary.sales.totalOrders) : "...",
        note: "Orders received in current period",
      },
      {
        label: "Pending Orders",
        value: summary ? formatNumber(summary.sales.pendingOrders) : "...",
        note: "Waiting for review and assignment",
      },
      {
        label: "Delivered Trips",
        value: summary ? formatNumber(summary.delivery.deliveredTrips) : "...",
        note: "Trips successfully completed",
      },
      {
        label: "Collection Value",
        value: summary ? formatCurrency(summary.sales.totalRevenue) : "...",
        note: "Revenue recorded from completed payments",
      },
    ],
    [summary]
  );

  const monthlySummary = (summary?.monthlySummary || []).slice(-4);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-br from-teal-900 via-stone-800 to-stone-900 p-6 text-white shadow-[0_25px_60px_rgba(28,25,23,0.35)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/90">
            Manager Operations Board
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-200 sm:text-base">
            Keep materials, dispatch, and billing aligned with real-time operational data.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{stat.value}</p>
            <p className="mt-2 text-sm leading-6 text-stone-500">{stat.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Execution Actions</h2>
          <p className="mt-1 text-sm text-stone-500">Manager-focused tasks to keep daily operations moving.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {actions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 transition-all hover:border-teal-300 hover:bg-white hover:shadow-sm"
              >
                <p className="text-sm font-semibold text-stone-900">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Today Focus</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Orders awaiting approval</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">
                {summary ? formatNumber(summary.sales.pendingOrders) : "..."}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Trips in transit</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">
                {summary ? formatNumber(summary.delivery.inTransitTrips) : "..."}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Pending payments</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">
                {summary ? formatNumber(summary.payments.pendingPayments) : "..."}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Low stock materials</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">
                {summary ? formatNumber(summary.stock.lowStockMaterials) : "..."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Delivery and Stock Snapshot</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Total Trips</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">
                {summary ? formatNumber(summary.delivery.totalTrips) : "..."}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Delivered Orders</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">
                {summary ? formatNumber(summary.delivery.deliveredOrders) : "..."}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Active Materials</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">
                {summary ? formatNumber(summary.stock.activeMaterials) : "..."}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Total Stock</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">
                {summary ? formatNumber(summary.stock.totalStock) : "..."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Recent Revenue Trend</h2>
          <div className="mt-4 space-y-3">
            {monthlySummary.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                Monthly trend will appear after payment activity is available.
              </p>
            ) : (
              monthlySummary.map((item) => (
                <div
                  key={item.month}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{item.label}</p>
                    <p className="text-xs text-stone-500">{formatNumber(item.transactions)} transactions</p>
                  </div>
                  <p className="text-sm font-semibold text-teal-700">{formatCurrency(item.revenue)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ManagerDashboard;
