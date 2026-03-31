import express from "express";
import upload from "../middleware/upload.js";
import {
  uploadMenuCSV,
  analyzeCSV,
  getMenuItems,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuPDF,
  saveEditedPDFMenuItems,
  uploadMenuPDFWithImages,
} from "../controller/menuController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// Route for CSV upload
router.post("/upload-csv", upload.single("file"), uploadMenuCSV);
router.post("/analyze-csv", upload.single("file"), analyzeCSV);
router.get("/", getMenuItems);
router.put("/:id", updateMenuItem);
router.delete("/:id", deleteMenuItem);

// Routes for PDF upload
router.post("/upload-pdf", upload.single("file"), uploadMenuPDF);
router.post(
  "/upload-pdf-with-images",
  upload.single("file"),
  uploadMenuPDFWithImages,
);
router.post("/save-pdf", saveEditedPDFMenuItems);

export default router;
