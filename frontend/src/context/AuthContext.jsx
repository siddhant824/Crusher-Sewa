import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

const parseJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp * 1000 <= Date.now();
};

const getStoredAuth = () => {
  try {
    const storedUser = localStorage.getItem("cms_user");
    const storedToken = localStorage.getItem("cms_token");
    const hasValidTokenShape = storedToken && storedToken.split(".").length === 3;

    if (!hasValidTokenShape || isTokenExpired(storedToken)) {
      return { user: null, token: null };
    }

    return {
      user: storedUser ? JSON.parse(storedUser) : null,
      token: storedToken || null,
    };
  } catch {
    return { user: null, token: null };
  }
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredAuth().user);
  const [token, setToken] = useState(() => getStoredAuth().token);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem("cms_user", JSON.stringify(user));
      localStorage.setItem("cms_token", token);
    } else {
      localStorage.removeItem("cms_user");
      localStorage.removeItem("cms_token");
    }
  }, [user, token]);

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const parseJsonSafe = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const login = async (email, password) => {
    if (!email || !password) {
      toast.error("Please enter both email and password");
      throw new Error("Email and password are required");
    }

    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const errorMessage = data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    setUser(data.user);
    setToken(data.token);

    // Show success message
    toast.success(data.message || `Welcome back, ${data.user.name}!`);

    // Redirect based on role
    if (data.user.role === "ADMIN") {
      navigate("/admin/dashboard");
    } else if (data.user.role === "MANAGER") {
      navigate("/manager/dashboard");
    } else {
      navigate("/contractor/materials");
    }
  };

  const register = async (name, email, password) => {
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      throw new Error("Name, email, and password are required");
    }

    const res = await fetch(`${apiBase}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const errorMessage = data?.message || "Registration failed. Please try again.";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    setUser(data.user);
    setToken(data.token);
    
    // Show success message
    toast.success(data.message || "Account created successfully! Welcome!");

    // Redirect based on role
    if (data.user.role === "ADMIN") {
      navigate("/admin/dashboard");
    } else if (data.user.role === "MANAGER") {
      navigate("/manager/dashboard");
    } else {
      navigate("/contractor/materials");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    toast.success("Logged out successfully");
    navigate("/");
  };

  const updateProfile = async ({ name, email }) => {
    if (!name || !email) {
      toast.error("Name and email are required");
      throw new Error("Name and email are required");
    }

    const activeToken = token || localStorage.getItem("cms_token");
    if (!activeToken) {
      toast.error("Please log in again");
      throw new Error("Token missing");
    }

    const res = await fetch(`${apiBase}/api/auth/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify({ name, email }),
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const errorMessage = data?.message || "Failed to update profile";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    setUser(data.user);
    toast.success(data.message || "Profile updated successfully");
    return data.user;
  };

  const value = { user, token, login, register, logout, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

