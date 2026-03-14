import { Router } from "express";
import { requireAuth, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = Router();

router.use(requireAuth);

router.post("/", authorizeRoles("CONTRACTOR"), createOrder);
router.get("/my", authorizeRoles("CONTRACTOR"), getMyOrders);
router.get("/", authorizeRoles("ADMIN", "MANAGER"), getAllOrders);
router.patch("/:id/status", authorizeRoles("ADMIN", "MANAGER"), updateOrderStatus);

export default router;
