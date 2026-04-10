import { Router } from "express";
import { registerUser, loginUser, updateMyProfile } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.patch("/me", requireAuth, updateMyProfile);

export default router;

