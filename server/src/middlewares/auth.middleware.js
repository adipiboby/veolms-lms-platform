import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const protect = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.cookies?.jwt ||
      req.cookies?.accessToken ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded.userId || decoded._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token payload",
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission",
      });
    }

    next();
  };
};