import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import courseRoutes from "./routes/course.routes.js";
import authRoutes from "./routes/auth.routes.js";
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

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
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "VeoLMS backend is running",
  });
});

export default app;