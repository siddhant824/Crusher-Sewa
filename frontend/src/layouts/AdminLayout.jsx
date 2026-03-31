import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => {
    if (location.pathname === path) return true;
    // For materials routes, check if pathname starts with the base path + /materials
    if (path.includes("/materials") && location.pathname.includes("/materials")) {
      return location.pathname.startsWith(basePath + "/materials");
    }
    if (path.includes("/stock") && location.pathname.includes("/stock")) {
      return location.pathname.startsWith(basePath + "/stock");
    }
    if (path.includes("/trucks") && location.pathname.includes("/trucks")) {
      return location.pathname.startsWith(basePath + "/trucks");
    }
    if (path.includes("/reports") && location.pathname.includes("/reports")) {
      return location.pathname.startsWith(basePath + "/reports");
    }
    if (path.includes("/payments") && location.pathname.includes("/payments")) {
      return location.pathname.startsWith(basePath + "/payments");
    }
    if (path.includes("/invoices") && location.pathname.includes("/invoices")) {
      return location.pathname.startsWith(basePath + "/invoices");
    }
    return location.pathname.startsWith(path + "/");
  };

  const isAdmin = user?.role === "ADMIN";
  const basePath = isAdmin ? "/admin" : "/manager";

  const navItems = [
    { path: `${basePath}/dashboard`, label: "Dashboard", icon: "grid", show: true },
    { path: `${basePath}/users`, label: "Manage Users", icon: "users", show: isAdmin },
    { path: `${basePath}/materials`, label: "Manage Materials", icon: "box", show: true },
    { path: `${basePath}/orders`, label: "Orders", icon: "clipboard", show: true },
    { path: `${basePath}/trucks`, label: "Trucks", icon: "truck", show: true },
    { path: `${basePath}/reports`, label: "Reports", icon: "chart", show: true },
    { path: `${basePath}/payments`, label: "Payments", icon: "wallet", show: true },
    { path: `${basePath}/invoices`, label: "Invoices", icon: "document", show: true },
    { path: `${basePath}/stock`, label: "Stock Control", icon: "chart", show: true },
  ].filter(item => item.show);

  const getIcon = (name) => {
    switch (name) {
      case "grid":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case "plus":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case "users":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case "box":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case "clipboard":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case "chart":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20V10m5 10V4m5 16v-6" />
          </svg>
        );
      case "truck":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 104 0m4 0a2 2 0 104 0m-4 0h-4m4 0V9a1 1 0 00-1-1h-3m0 0V6a1 1 0 00-1-1H3a1 1 0 00-1 1v11h2m10-9h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V17h-2" />
          </svg>
        );
      case "wallet":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-6h3v6h-3a2 2 0 110-4h3" />
          </svg>
        );
      case "document":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex overflow-x-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col fixed h-full">
        <div className="p-6">
          <Link to={`${basePath}/dashboard`} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <div>
              <span className="text-base font-semibold text-stone-800 block">Crusher Sewa</span>
              <span className="text-xs text-stone-400">{isAdmin ? "Admin Panel" : "Manager Panel"}</span>
            </div>
          </Link>
        </div>

        <nav className="px-3 flex-1">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wider px-3 mb-2">
            Menu
          </div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? "bg-teal-50 text-teal-700"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                {getIcon(item.icon)}
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-stone-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-teal-700 font-medium text-sm">
                {user?.name?.charAt(0) || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{user?.name}</p>
              <p className="text-xs text-stone-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-w-0 overflow-x-hidden">
        <div className="p-8 max-w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
