import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createBookingSlot,
  getBookingSlotById,
  getBookingSlots,
  updateBookingSlot,
  toggleBookingSlotStatus,
  deleteBookingSlot,
} from "../controller/bookingSlotController.js";

const router = express.Router();

router.use(protect);

// Routes
router.post("/create", createBookingSlot);
router.get("/:id", getBookingSlotById);
router.get("/", getBookingSlots);
router.put("/:id", updateBookingSlot);
router.delete("/:id", deleteBookingSlot);
router.patch("/:id/status", toggleBookingSlotStatus);

export default router;
