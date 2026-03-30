import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import { ensureAdminSeed } from "./models/User.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import truckRoutes from "./routes/truckRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Crusher Material Sewa" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/delivery-trips", deliveryRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reports", reportRoutes);

// Start server after DB connects
const start = async () => {
  try {
    await connectDB();
    // Only seed admin if it doesn't exist (check first to avoid unnecessary updates)
    try {
      const User = (await import("./models/User.js")).default;
      const existingAdmin = await User.findOne({ email: "admin@gmail.com" });
      if (!existingAdmin) {
        const result = await ensureAdminSeed();
        console.log(`✅ Admin seed ${result}`);
      } else {
        console.log(`ℹ️  Admin user already exists, skipping seed`);
      }
    } catch (seedErr) {
      console.error("⚠️  Admin seed check failed:", seedErr.message);
    }
    app.listen(port, () => {
      console.log(`🚀 API running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

// Only start if not under test
if (process.env.NODE_ENV !== "test") {
  start();
}

export { app };
