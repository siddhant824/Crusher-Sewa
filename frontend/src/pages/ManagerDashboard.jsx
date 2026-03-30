import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth.js";
import { getReportSummary } from "../services/reportsApi.js";

const actions = [
  {
    title: "Manage Materials",
    desc: "Update material details and keep visible stock accurate.",
    path: "/manager/materials",
  },
  {
    title: "Stock Control",
    desc: "Record production, manual adjustments, and review stock history.",
    path: "/manager/stock",
  },
  {
    title: "Delivery",
    desc: "Create truck trips and update dispatch or delivery progress.",
    path: "/manager/delivery",
  },
  {
    title: "Payments",
    desc: "Track transaction history and manual collections.",
    path: "/manager/payments",
  },
  {
    title: "Invoices",
    desc: "Generate invoices for approved orders.",
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

  const stats = [
    {
      label: "Revenue",
      value: summary ? `Rs. ${summary.sales.totalRevenue.toFixed(2)}` : "...",
      note: "Collected through online and manual payments",
    },
    {
      label: "Pending Orders",
      value: summary ? String(summary.sales.pendingOrders) : "...",
      note: "Orders still waiting for action",
    },
    {
      label: "Delivered Trips",
      value: summary ? String(summary.delivery.deliveredTrips) : "...",
      note: "Completed truck trips so far",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-stone-500">
          Keep operations moving with live summaries for stock, deliveries, invoices, and payments.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="mb-1 text-sm text-stone-500">{stat.label}</p>
            <p className="text-2xl font-semibold text-stone-900">{stat.value}</p>
            <p className="mt-1 text-sm text-stone-500">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="rounded-xl border border-stone-200 bg-white p-5 transition-all hover:border-teal-300 hover:shadow-sm"
            >
              <h3 className="font-medium text-stone-900">{action.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-stone-700">Manager Workspace</p>
            <p className="mt-1 text-sm text-stone-500">
              Use delivery, invoices, and payments together to move approved orders all the way to completion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
