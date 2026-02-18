import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import passport from "passport";
import { setupPassport } from "./config/passport.js";

dotenv.config();

// Routes
import vendorRoutes from "./routes/vendorRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import sectionRoutes from "./routes/sectionRoutes.js";

const app = express();
const port = process.env.PORT || 5002;

connectDB();
setupPassport();

// Middleware to parse json bodies
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use("/api/vendor", vendorRoutes);
app.use("/api/vendor/tables", tableRoutes);
app.use("/api/vendor/auth", googleAuthRoutes);
app.use("/api/vendor/menu", menuRoutes);
app.use("/api/vendor/sections", sectionRoutes);

app.listen(port, () => console.log(`Server running on port ${port}`));
