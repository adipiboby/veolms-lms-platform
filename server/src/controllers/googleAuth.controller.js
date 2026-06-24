import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const sendTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const buildUserResponse = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || "",
    authProvider: user.authProvider || "local",
  };
};

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: "GOOGLE_CLIENT_ID is missing in server .env",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();
    const emailVerified = payload.email_verified;
    const name = payload.name;
    const picture = payload.picture;

    if (!email || !emailVerified) {
      return res.status(401).json({
        success: false,
        message: "Google email is not verified",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");

      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: randomPassword,
        role: "student",
        googleId,
        avatar: picture || "",
        authProvider: "google",
      });
    } else {
      let shouldSave = false;

      if (!user.googleId) {
        user.googleId = googleId;
        shouldSave = true;
      }

      if (!user.avatar && picture) {
        user.avatar = picture;
        shouldSave = true;
      }

      if (!user.authProvider) {
        user.authProvider = "local";
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save({ validateBeforeSave: false });
      }
    }

    const token = createToken(user);

    sendTokenCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(500).json({
      success: false,
      message: "Google login failed",
    });
  }
};