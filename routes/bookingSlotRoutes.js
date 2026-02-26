import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createBookingSlot,
  getBookingSlotById,
} from "../controller/bookingSlotController.js";

const router = express.Router();

router.use(protect);

// Routes
router.post("/create", createBookingSlot);
router.get("/:id", getBookingSlotById);

export default router;
