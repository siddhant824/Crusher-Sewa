import { Router } from "express";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";
import {
  getAllPayments,
  getMyPayments,
  getPaymentSummary,
  getPaymentsForOrder,
  handleEsewaCallback,
  initiateEsewaPayment,
  recordManualPayment,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = Router();

router.route("/callback/esewa").get(handleEsewaCallback).post(handleEsewaCallback);

router.use(requireAuth);

router.post("/initiate/esewa", authorizeRoles("CONTRACTOR"), initiateEsewaPayment);
router.get("/my", authorizeRoles("CONTRACTOR"), getMyPayments);
router.get("/", authorizeRoles("ADMIN", "MANAGER"), getAllPayments);
router.get("/summary", authorizeRoles("ADMIN", "MANAGER"), getPaymentSummary);
router.post("/manual", authorizeRoles("ADMIN", "MANAGER"), recordManualPayment);
router.post("/:id/verify", authorizeRoles("ADMIN", "MANAGER", "CONTRACTOR"), verifyPayment);
router.get("/order/:orderId", authorizeRoles("ADMIN", "MANAGER", "CONTRACTOR"), getPaymentsForOrder);

export default router;
