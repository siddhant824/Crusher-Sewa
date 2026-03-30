import { Router } from "express";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";
import { getReportSummary } from "../controllers/reportController.js";

const router = Router();

router.use(requireAuth);
router.get("/summary", authorizeRoles("ADMIN", "MANAGER"), getReportSummary);

export default router;
