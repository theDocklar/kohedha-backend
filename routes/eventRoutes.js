import express from "express";
import { 
  createEvent,
  getVendorEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  updateEventRegistrations,
} from "../controller/eventController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/new", createEvent);
router.get("/", getVendorEvents);
router.get("/:id", getEventById);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);
router.put("/:id/registrations", updateEventRegistrations);

export default router;
