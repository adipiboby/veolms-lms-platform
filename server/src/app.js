import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import courseRoutes from "./routes/course.routes.js";

import paymentRoutes from "./routes/payment.routes.js";

import enrollmentRoutes from "./routes/enrollment.routes.js";
const app = express();

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173"||"http://192.168.31.78:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "VeoLMS backend is running",
    clientUrl: process.env.CLIENT_URL,
  });
});

export default app;