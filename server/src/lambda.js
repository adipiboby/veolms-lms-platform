import dotenv from "dotenv";
import serverless from "serverless-http";

import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();

let dbConnectionPromise = null;

const connectToDatabase = async () => {
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDB();
  }

  return dbConnectionPromise;
};

const expressHandler = serverless(app);

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  await connectToDatabase();

  return expressHandler(event, context);
};
