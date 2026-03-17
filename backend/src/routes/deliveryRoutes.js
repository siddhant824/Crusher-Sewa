import { Router } from "express";
import { requireAuth, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createDeliveryTrip,
  getDeliveryTripsForOrder,
  updateDeliveryTrip,
} from "../controllers/deliveryController.js";

const router = Router();

router.use(requireAuth);

router.get("/order/:orderId", getDeliveryTripsForOrder);
router.post("/", authorizeRoles("ADMIN", "MANAGER"), createDeliveryTrip);
router.patch("/:id", authorizeRoles("ADMIN", "MANAGER"), updateDeliveryTrip);

export default router;
