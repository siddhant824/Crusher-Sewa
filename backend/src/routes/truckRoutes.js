import { Router } from "express";
import { requireAuth, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createTruck,
  deleteTruck,
  getTrucks,
  updateTruck,
} from "../controllers/truckController.js";

const router = Router();

router.use(requireAuth);

router.get("/", authorizeRoles("ADMIN", "MANAGER"), getTrucks);
router.post("/", authorizeRoles("ADMIN"), createTruck);
router.patch("/:id", authorizeRoles("ADMIN", "MANAGER"), updateTruck);
router.delete("/:id", authorizeRoles("ADMIN"), deleteTruck);

export default router;
