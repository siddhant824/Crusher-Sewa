import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth.js";
import { getReportSummary } from "../../services/reportsApi.js";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (value) => new Intl.NumberFormat("en-NP").format(Number(value || 0));

const Dashboard = () => {
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

  const quickActions = [
    {
      title: "Manage Users",
      desc: "Create and control system access for staff accounts.",
      path: "/admin/users",
      icon: "users",
    },
    {
      title: "Order Desk",
      desc: "Review pending orders and move approvals faster.",
      path: "/admin/orders",
      icon: "orders",
    },
    {
      title: "Payments",
      desc: "Track due collections and record manual payments.",
      path: "/admin/payments",
      icon: "payments",
    },
    {
      title: "Invoices",
      desc: "Create invoices and manage billing lifecycle.",
      path: "/admin/invoices",
      icon: "invoices",
    },
  ];

  const kpiCards = useMemo(
    () => [
      {
        label: "Total Revenue",
        value: summary ? formatCurrency(summary.sales.totalRevenue) : "...",
        note: "Completed and partially refunded payments",
      },
      {
        label: "Outstanding Amount",
        value: summary ? formatCurrency(summary.payments.unpaidAmountTotal) : "...",
        note: "Unpaid order balance requiring follow-up",
      },
      {
        label: "Pending Orders",
        value: summary ? formatNumber(summary.sales.pendingOrders) : "...",
        note: "Orders waiting for operational action",
      },
      {
        label: "Low Stock Materials",
        value: summary ? formatNumber(summary.stock.lowStockMaterials) : "...",
        note: "Materials at or below threshold",
      },
    ],
    [summary]
  );

  const topMaterials = summary?.topSellingMaterials || [];
  const monthlySummary = (summary?.monthlySummary || []).slice(-4);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-900 via-stone-800 to-teal-900 p-6 text-white shadow-[0_25px_60px_rgba(28,25,23,0.35)] sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-48 w-48 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/90">
            Admin Command Center
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-200 sm:text-base">
            Monitor sales, stock, dispatch, invoicing, and collections from one operational dashboard.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              {card.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-500">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Quick Actions</h2>
          <p className="mt-1 text-sm text-stone-500">Common admin tasks for daily operations.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="group rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 transition-all hover:border-teal-300 hover:bg-white hover:shadow-sm"
              >
                <p className="text-sm font-semibold text-stone-900">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Live Operations</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Approved Orders</p>
              <p className="text-sm font-semibold text-stone-900">
                {summary ? formatNumber(summary.sales.approvedOrders) : "..."}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Outstanding Orders</p>
              <p className="text-sm font-semibold text-stone-900">
                {summary ? formatNumber(summary.payments.outstandingOrders) : "..."}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">Delivered Trips</p>
              <p className="text-sm font-semibold text-stone-900">
                {summary ? formatNumber(summary.delivery.deliveredTrips) : "..."}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-stone-600">In Transit Trips</p>
              <p className="text-sm font-semibold text-stone-900">
                {summary ? formatNumber(summary.delivery.inTransitTrips) : "..."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Top Selling Materials</h2>
          <div className="mt-4 space-y-3">
            {topMaterials.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                No approved order data yet.
              </p>
            ) : (
              topMaterials.map((item) => (
                <div
                  key={item.materialName}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-stone-900">{item.materialName}</p>
                    <p className="text-sm text-stone-600">{formatCurrency(item.totalRevenue)}</p>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">
                    {formatNumber(item.totalQuantity)} {item.unit}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Monthly Revenue</h2>
          <div className="mt-4 space-y-3">
            {monthlySummary.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                Monthly payment summary will appear after transactions are recorded.
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

export default Dashboard;
