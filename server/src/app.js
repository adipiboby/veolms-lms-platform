import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import courseRoutes from "./routes/course.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import certificateRoutes from "./routes/certificate.routes.js";
import videoRoutes from "./routes/video.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import noteRoutes from "./routes/note.routes.js";
import adminAnalyticsRoutes from "./routes/adminAnalytics.routes.js";
import adminStudentsRoutes from "./routes/adminStudents.routes.js";
import lessonCommentRoutes from "./routes/lessonComment.routes.js";
import lessonResourceRoutes from "./routes/lessonResource.routes.js";
import adminCourseEditRoutes from "./routes/adminCourseEdit.routes.js";
import feedRoutes from "./routes/feed.routes.js";
const app = express();

/**
 * Important for production when backend is behind
 * Nginx / Render / Railway / AWS Load Balancer / Cloudflare.
 * This helps express-rate-limit detect real user IP.
 */
app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://app.lms.adipi.in",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allows Postman, server-to-server requests, and mobile apps with no Origin header
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(
  helmet({
    crossOriginOpenerPolicy: false,
  }),
);

/**
 * This parses JSON body:
 * req.body will work for JSON requests.
 *
 * 10mb is enough because videos are uploaded directly to S3,
 * not through express.json().
 */
app.use(express.json({ limit: "10mb" }));

/**
 * This parses form-encoded body:
 * title=React&price=999
 */
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use("/api", limiter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "VeoLMS API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/students", adminStudentsRoutes);
app.use("/api/admin/courses", adminCourseEditRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/lesson-comments", lessonCommentRoutes);
app.use("/api/lesson-resources", lessonResourceRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/feed", feedRoutes);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("GLOBAL_ERROR_HANDLER:", error);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

export default app;
