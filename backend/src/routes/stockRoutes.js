import { Router } from "express";
import { requireAuth, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createManualAdjustment,
  createProductionEntry,
  getInventoryLogs,
  getProductionLogs,
} from "../controllers/stockController.js";

const router = Router();

router.use(requireAuth);
router.use(authorizeRoles("ADMIN", "MANAGER"));

router.get("/inventory-logs", getInventoryLogs);
router.get("/production-logs", getProductionLogs);
router.post("/production", createProductionEntry);
router.post("/manual-adjustment", createManualAdjustment);

export default router;
