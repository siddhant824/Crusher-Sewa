import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth.js";
import { getReportSummary } from "../../services/reportsApi.js";

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
      desc: "View and manage all users",
      path: "/admin/users",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: "Payments",
      desc: "Review transactions and record manual payments",
      path: "/admin/payments",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-6h3v6h-3a2 2 0 110-4h3" />
        </svg>
      ),
    },
    {
      title: "Invoices",
      desc: "Generate invoice records and printable invoice pages",
      path: "/admin/invoices",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const stats = [
    { label: "Revenue", value: summary ? `Rs. ${summary.sales.totalRevenue.toFixed(2)}` : "..." },
    { label: "Stock Summary", value: summary ? `${summary.stock.totalStock.toFixed(2)}` : "..." },
    { label: "Pending Payments", value: summary ? String(summary.payments.pendingPayments) : "..." },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-stone-500">
          Here is the latest operational summary across sales, stock, and payments.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="mb-1 text-sm text-stone-500">{stat.label}</p>
            <p className="text-2xl font-semibold text-stone-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="group rounded-xl border border-stone-200 bg-white p-5 transition-all hover:border-teal-300 hover:shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-medium text-stone-900">{action.title}</h3>
                  <p className="mt-0.5 text-sm text-stone-500">{action.desc}</p>
                </div>
              </div>
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
            <p className="text-sm font-medium text-stone-700">Admin Panel</p>
            <p className="mt-1 text-sm text-stone-500">
              Use the new payments and invoices sections to manage collections, printable billing, and transaction history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
