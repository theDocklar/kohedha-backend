import express from "express";
import {
  createDeal,
  getAllDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  getDealsByCategory,
} from "../controller/dealController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// CRUD routes
router.post("/new", createDeal);
router.get("/", getAllDeals);
router.get("/category/:category", getDealsByCategory);
router.get("/:id", getDealById);
router.put("/:id", updateDeal);
router.delete("/:id", deleteDeal);

export default router;
