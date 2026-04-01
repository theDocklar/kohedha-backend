import multer from "multer";
import path from "path";
import fs from "fs";

// ── Memory storage (CSV / PDF) ────────────────────────────────────────────────
const memoryStorage = multer.memoryStorage();

const csvPdfFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "application/pdf",
  ];
  const allowedExtensions = [".csv", ".pdf"];

  const ext = path.extname(file.originalname).toLowerCase();
  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV and PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: memoryStorage,
  fileFilter: csvPdfFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

// Disk storage (menu item images)
const MENU_IMAGE_DIR = "uploads/menu-images";

// Ensure the directory exists at startup
if (!fs.existsSync(MENU_IMAGE_DIR)) {
  fs.mkdirSync(MENU_IMAGE_DIR, { recursive: true });
}

const menuImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MENU_IMAGE_DIR),
  filename: (_req, file, cb) => {
    const short = Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `m-${short}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

  const ext = path.extname(file.originalname).toLowerCase();
  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
  }
};

export const uploadMenuImage = multer({
  storage: menuImageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
});

export default upload;
