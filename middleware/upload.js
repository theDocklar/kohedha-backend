import multer from "multer";
import path from "path";

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Filter to accept only CSV files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "application/pdf",
  ];
  const allowedExtensions = [".csv", ".pdf"];

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (allowedMimeTypes.includes(mimeType) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV and PDF files are allowed"), false);
  }
};

// Configure multer with limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
  },
});

export default upload;
