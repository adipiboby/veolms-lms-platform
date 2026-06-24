import express from "express";
import {
  generateCertificate,
  getCertificateForCourse,
  getMyCertificates,
  verifyCertificate,
} from "../controllers/certificate.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/verify/:certificateId", verifyCertificate);

router.post(
  "/generate",
  protect,
  authorizeRoles("student"),
  generateCertificate
);

router.get(
  "/my",
  protect,
  authorizeRoles("student"),
  getMyCertificates
);

router.get(
  "/course/:courseId",
  protect,
  authorizeRoles("student"),
  getCertificateForCourse
);

export default router;