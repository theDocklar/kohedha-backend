import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createBookingSlot,
  getBookingSlotById,
  getBookingSlots,
  updateBookingSlot,
  toggleBookingSlotStatus,
  deleteBookingSlot,
  getBookingSlotReservations,
  createRecurringBookingSlot,
  deleteRecurringSeries,
  confirmReservation,
  cancelReservation
} from "../controller/bookingSlotController.js";

const router = express.Router();

// Recurring slot routes
router.post("/recurring", protect, createRecurringBookingSlot);
router.delete("/recurring/:groupId", protect, deleteRecurringSeries);

// Normal slot routes
router.post("/create", protect, createBookingSlot);
router.get("/:id", protect, getBookingSlotById);
router.get("/", protect, getBookingSlots);
router.put("/:id", protect, updateBookingSlot);
router.delete("/:id", protect, deleteBookingSlot);
router.patch("/:id/status", protect, toggleBookingSlotStatus);
router.get("/:id/reservation", protect, getBookingSlotReservations);
router.patch("/:slotId/reservation/confirm/:reservationId", protect, confirmReservation);
router.patch("/:slotId/reservation/cancel/:reservationId", protect, cancelReservation);

export default router;
