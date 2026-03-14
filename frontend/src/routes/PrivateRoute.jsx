import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === "MANAGER") {
      return <Navigate to="/manager/dashboard" replace />;
    } else {
      return <Navigate to="/contractor/materials" replace />;
    }
  }

  return children;
};

export default PrivateRoute;

