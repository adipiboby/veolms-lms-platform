import dotenv from "dotenv";

import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`VeoLMS API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("SERVER_START_ERROR:", error);
    process.exit(1);
  }
};

startServer();
