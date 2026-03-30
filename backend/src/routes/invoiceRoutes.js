import { Router } from "express";
import { authorizeRoles, requireAuth } from "../middleware/authMiddleware.js";
import { generateInvoice, getInvoiceById, getInvoices } from "../controllers/invoiceController.js";

const router = Router();

router.use(requireAuth);

router.get("/", authorizeRoles("ADMIN", "MANAGER", "CONTRACTOR"), getInvoices);
router.get("/:id", authorizeRoles("ADMIN", "MANAGER", "CONTRACTOR"), getInvoiceById);
router.post("/", authorizeRoles("ADMIN", "MANAGER"), generateInvoice);

export default router;
