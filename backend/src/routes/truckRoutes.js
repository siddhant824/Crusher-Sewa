import { Router } from "express";
import { requireAuth, authorizeRoles } from "../middleware/authMiddleware.js";
import { createTruck, getTrucks } from "../controllers/truckController.js";

const router = Router();

router.use(requireAuth);
router.use(authorizeRoles("ADMIN", "MANAGER"));

router.get("/", getTrucks);
router.post("/", createTruck);

export default router;
