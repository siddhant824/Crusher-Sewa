import { Router } from "express";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";
import {
  getPaymentsForOrder,
  handleEsewaCallback,
  initiateEsewaPayment,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = Router();

router.route("/callback/esewa").get(handleEsewaCallback).post(handleEsewaCallback);

router.use(requireAuth);

router.post("/initiate/esewa", authorizeRoles("CONTRACTOR"), initiateEsewaPayment);
router.post("/:id/verify", authorizeRoles("ADMIN", "MANAGER", "CONTRACTOR"), verifyPayment);
router.get("/order/:orderId", authorizeRoles("ADMIN", "MANAGER", "CONTRACTOR"), getPaymentsForOrder);

export default router;
