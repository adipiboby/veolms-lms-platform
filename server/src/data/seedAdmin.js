import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminName = process.env.ADMIN_NAME || "VeoLMS Admin";
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
      process.exit(1);
    }

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      existingAdmin.name = adminName;
      existingAdmin.role = "admin";

      if (adminPassword) {
        existingAdmin.password = adminPassword;
      }

      await existingAdmin.save();

      console.log("Admin account updated successfully");
      console.log(`Email: ${adminEmail}`);
      process.exit(0);
    }

    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });

    console.log("Admin account created successfully");
    console.log(`Email: ${adminEmail}`);
    process.exit(0);
  } catch (error) {
    console.error("Admin seed error:", error.message);
    process.exit(1);
  }
};

seedAdmin();