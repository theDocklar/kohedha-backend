import express from "express";
import { firebaseAuth } from "../middleware/firebaseAuth.js";
import {
  getMobileEvents,
  getMobileEventById,
  getMobileDeals,
  getMobileDealById,
} from "../controller/mobileController.js";

const router = express.Router();

// All /api/mobile/* routes require a valid Firebase ID token
router.use(firebaseAuth);

// Events
router.get("/events", getMobileEvents);
router.get("/events/:id", getMobileEventById);

// Deals
router.get("/deals", getMobileDeals);
router.get("/deals/:id", getMobileDealById);

export default router;
