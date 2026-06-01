import express from "express";
import { firebaseAuth } from "../middleware/firebaseAuth.js";
import {
  getMobileEvents,
  getMobileEventById,
  getMobileDeals,
  getMobileDealById,
  getMobileVenues,
  saveUserProfile,
  updateUserProfile,
  getMobileUserByEmail,
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

// Venues
router.get("/venues", getMobileVenues);

// User profile
router.get("/user", getMobileUserByEmail);
router.post("/user/profile", saveUserProfile);
router.put("/user/profile", updateUserProfile);

export default router;
