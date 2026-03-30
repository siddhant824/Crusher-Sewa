import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const ContractorLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/contractor/materials", label: "Materials" },
    { path: "/contractor/orders", label: "My Orders" },
    { path: "/contractor/payments", label: "Payments" },
    { path: "/contractor/profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7faf9_0%,#f5f5f4_28%,#fafaf9_100%)]">
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex min-h-[72px] flex-col justify-center gap-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
            <div className="flex items-center justify-between gap-4">
              <Link to="/contractor/materials" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 shadow-sm shadow-teal-900/10">
                  <span className="text-sm font-bold text-white">CS</span>
                </div>
                <div>
                  <span className="block text-lg font-semibold tracking-tight text-stone-900">
                    Crusher Sewa
                  </span>
                  <span className="block text-xs text-stone-500">
                    Contractor Portal
                  </span>
                </div>
              </Link>

              <button
                onClick={logout}
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 sm:hidden"
              >
                Logout
              </button>
            </div>

            <div className="flex items-center gap-4">
              <nav className="hidden items-center gap-1 rounded-2xl border border-stone-200 bg-stone-50/80 p-1 sm:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      isActive(item.path)
                        ? "bg-white text-teal-700 shadow-sm ring-1 ring-stone-200"
                        : "text-stone-600 hover:bg-white hover:text-stone-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden items-center gap-3 sm:flex">
                <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100">
                    <span className="text-sm font-semibold text-teal-700">
                      {user?.name?.charAt(0) || "C"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{user?.name}</p>
                    <p className="truncate text-xs text-stone-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200 sm:hidden">
          <div className="mx-auto flex max-w-7xl px-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 border-b-2 px-2 py-3 text-center text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-stone-500"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-[28px] border border-white/70 bg-white/70 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_18px_45px_rgba(15,23,42,0.04)] backdrop-blur sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ContractorLayout;
