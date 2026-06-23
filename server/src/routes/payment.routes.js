import express from "express";
import {
  createOrder,
  verifyPayment,
} from "../controllers/payment.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/create-order",
  protect,
  authorizeRoles("student"),
  createOrder
);

router.post(
  "/verify",
  protect,
  authorizeRoles("student"),
  verifyPayment
);

export default router;