import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const stats = [
  { label: "Materials", value: "Live", note: "Inventory can be created and updated" },
  { label: "Orders", value: "Live", note: "Approval now updates order status and stock" },
  { label: "Stock Logs", value: "Live", note: "Production and adjustment logs are now available" },
];

const actions = [
  {
    title: "Add Material",
    desc: "Create a new material with rate, stock, and optional image.",
    path: "/manager/materials/add",
  },
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
];

const ManagerDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-stone-500 mt-1">
          Manage materials and prepare the next operational modules for orders and stock flow.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-stone-200 rounded-xl p-5"
          >
            <p className="text-sm text-stone-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-semibold text-stone-900">{stat.value}</p>
            <p className="text-sm text-stone-500 mt-1">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {actions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="bg-white border border-stone-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-stone-900">{action.title}</h3>
              <p className="text-sm text-stone-500 mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-stone-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-stone-700">Manager Workspace</p>
            <p className="text-sm text-stone-500 mt-1">
              This dashboard now shares the same sidebar layout as the rest of the manager area.
              Orders, production, deliveries, invoices, and payments are the next modules to add.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
