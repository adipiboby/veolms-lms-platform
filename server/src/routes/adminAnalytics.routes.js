import express from "express";

import { getAdminAnalytics } from "../controllers/adminAnalytics.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin"), getAdminAnalytics);

export default router;
