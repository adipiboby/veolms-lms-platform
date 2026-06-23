import express from "express";
import {
  getAdminOverview,
  getAdminStudents,
  getAdminEnrollments,
} from "../controllers/admin.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/overview", protect, authorizeRoles("admin"), getAdminOverview);

router.get("/students", protect, authorizeRoles("admin"), getAdminStudents);

router.get(
  "/enrollments",
  protect,
  authorizeRoles("admin"),
  getAdminEnrollments,
);

export default router;
