import express from "express";

import { getAdminStudents } from "../controllers/adminStudents.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin"), getAdminStudents);

export default router;
