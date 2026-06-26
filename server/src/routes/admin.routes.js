import express from "express";

import { getAdminOverview } from "../controllers/admin.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/overview",
  protect,
  authorizeRoles("admin"),
  getAdminOverview
);

export default router;