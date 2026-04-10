import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getDashboardPath = () => {
    if (user?.role === "ADMIN") return "/admin/dashboard";
    if (user?.role === "MANAGER") return "/manager/dashboard";
    return "/contractor/materials";
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <span className="text-lg font-semibold text-stone-800">
              Crusher Sewa
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium text-sm"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={getDashboardPath()}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium text-sm"
                >
                  Logout
                </button>
              </>
            )
            }
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
