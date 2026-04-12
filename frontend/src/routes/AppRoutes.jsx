import { Route, Routes, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";
import ContractorLayout from "../layouts/ContractorLayout.jsx";
import LandingPage from "../pages/LandingPage.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
import Dashboard from "../pages/admin/Dashboard.jsx";
import CreateUser from "../pages/admin/CreateUser.jsx";
import ManageUsers from "../pages/admin/ManageUsers.jsx";
import AddMaterial from "../pages/admin/AddMaterial.jsx";
import ManageMaterials from "../pages/admin/ManageMaterials.jsx";
import ManagerDashboard from "../pages/ManagerDashboard.jsx";
import OrdersManagement from "../pages/OrdersManagement.jsx";
import DeliveryManagement from "../pages/DeliveryManagement.jsx";
import StockControl from "../pages/StockControl.jsx";
import TrucksManagement from "../pages/TrucksManagement.jsx";
import AddTruck from "../pages/AddTruck.jsx";
import Materials from "../pages/contractor/Materials.jsx";
import Cart from "../pages/contractor/Cart.jsx";
import Orders from "../pages/contractor/Orders.jsx";
import DeliveryHistory from "../pages/contractor/DeliveryHistory.jsx";
import Invoices from "../pages/contractor/Invoices.jsx";
import PaymentHistory from "../pages/contractor/PaymentHistory.jsx";
import Profile from "../pages/contractor/Profile.jsx";
import PaymentReturn from "../pages/PaymentReturn.jsx";
import PaymentManagement from "../pages/PaymentManagement.jsx";
import InvoicesManagement from "../pages/InvoicesManagement.jsx";
import InvoiceView from "../pages/InvoiceView.jsx";
import ReportsOverview from "../pages/ReportsOverview.jsx";
import PrivateRoute from "./PrivateRoute.jsx";

const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Route>

    <Route path="/payment-return" element={<PaymentReturn />} />

    <Route
      path="/admin"
      element={
        <PrivateRoute allowedRoles={["ADMIN"]}>
          <Navigate to="/admin/dashboard" replace />
        </PrivateRoute>
      }
    />
    <Route
      element={
        <PrivateRoute allowedRoles={["ADMIN"]}>
          <AdminLayout />
        </PrivateRoute>
      }
    >
      <Route path="/admin/dashboard" element={<Dashboard />} />
      <Route path="/admin/users/create" element={<CreateUser />} />
      <Route path="/admin/users" element={<ManageUsers />} />
      <Route path="/admin/materials/add" element={<AddMaterial />} />
      <Route path="/admin/materials" element={<ManageMaterials />} />
      <Route path="/admin/orders" element={<OrdersManagement />} />
      <Route path="/admin/orders/:orderId/delivery" element={<DeliveryManagement />} />
      <Route path="/admin/reports" element={<ReportsOverview />} />
      <Route path="/admin/payments" element={<PaymentManagement />} />
      <Route path="/admin/invoices" element={<InvoicesManagement />} />
      <Route path="/admin/invoices/:id" element={<InvoiceView />} />
      <Route path="/admin/delivery" element={<Navigate to="/admin/orders" replace />} />
      <Route path="/admin/trucks" element={<TrucksManagement />} />
      <Route path="/admin/trucks/add" element={<AddTruck />} />
      <Route path="/admin/stock" element={<StockControl />} />
    </Route>
    <Route
      path="/manager"
      element={
        <PrivateRoute allowedRoles={["MANAGER", "ADMIN"]}>
          <Navigate to="/manager/dashboard" replace />
        </PrivateRoute>
      }
    />
    <Route
      element={
        <PrivateRoute allowedRoles={["MANAGER", "ADMIN"]}>
          <AdminLayout />
        </PrivateRoute>
      }
    >
      <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      <Route path="/manager/materials/add" element={<AddMaterial />} />
      <Route path="/manager/materials" element={<ManageMaterials />} />
      <Route path="/manager/orders" element={<OrdersManagement />} />
      <Route path="/manager/orders/:orderId/delivery" element={<DeliveryManagement />} />
      <Route path="/manager/reports" element={<ReportsOverview />} />
      <Route path="/manager/payments" element={<PaymentManagement />} />
      <Route path="/manager/invoices" element={<InvoicesManagement />} />
      <Route path="/manager/invoices/:id" element={<InvoiceView />} />
      <Route path="/manager/delivery" element={<Navigate to="/manager/orders" replace />} />
      <Route path="/manager/trucks" element={<TrucksManagement />} />
      <Route path="/manager/stock" element={<StockControl />} />
    </Route>
    <Route
      path="/contractor"
      element={
        <PrivateRoute allowedRoles={["CONTRACTOR"]}>
          <Navigate to="/contractor/materials" replace />
        </PrivateRoute>
      }
    />
    <Route
      element={
        <PrivateRoute allowedRoles={["CONTRACTOR"]}>
          <ContractorLayout />
        </PrivateRoute>
      }
    >
      <Route path="/contractor/materials" element={<Materials />} />
      <Route path="/contractor/cart" element={<Cart />} />
      <Route path="/contractor/orders" element={<Orders />} />
      <Route path="/contractor/deliveries" element={<DeliveryHistory />} />
      <Route path="/contractor/invoices" element={<Invoices />} />
      <Route path="/contractor/payments" element={<PaymentHistory />} />
      <Route path="/contractor/invoices/:id" element={<InvoiceView />} />
      <Route path="/contractor/profile" element={<Profile />} />
    </Route>
  </Routes>
);

export default AppRoutes;

