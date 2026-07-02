import fs from "fs";

export const getCloudFrontPrivateKey = () => {
  if (process.env.CLOUDFRONT_PRIVATE_KEY_BASE64) {
    return Buffer.from(
      process.env.CLOUDFRONT_PRIVATE_KEY_BASE64,
      "base64",
    ).toString("utf8");
  }

  if (process.env.CLOUDFRONT_PRIVATE_KEY) {
    return process.env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, "\n");
  }

  if (process.env.CLOUDFRONT_PRIVATE_KEY_PATH) {
    return fs.readFileSync(process.env.CLOUDFRONT_PRIVATE_KEY_PATH, "utf8");
  }

  throw new Error(
    "Missing CloudFront private key. Set CLOUDFRONT_PRIVATE_KEY_BASE64 or CLOUDFRONT_PRIVATE_KEY_PATH.",
  );
};