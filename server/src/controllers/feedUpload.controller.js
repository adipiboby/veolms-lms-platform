import crypto from "crypto";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import multer from "multer";


const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export const uploadFeedImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }

    cb(null, true);
  },
}).single("image");
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION  || "us-east-1",
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

const cleanFileName = (fileName = "image") => {
  const extension = path.extname(fileName).toLowerCase();

  const baseName = path
    .basename(fileName, extension)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);

  return `${baseName || "feed-image"}${extension || ".jpg"}`;
};

export const uploadFeedImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required.",
      });
    }

    const bucketName =
      process.env.AWS_S3_BUCKET ||
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.S3_BUCKET_NAME ||
      process.env.S3_BUCKET;

    const region = process.env.AWS_S3_REGION  || "us-east-1";

    const cloudFrontUrl =
      process.env.FEED_CLOUDFRONT_URL || process.env.AWS_CLOUDFRONT_URL;

    if (!bucketName) {
      return res.status(500).json({
        success: false,
        message:
          "S3 bucket name is missing. Add AWS_S3_BUCKET or AWS_S3_BUCKET_NAME in .env.",
      });
    }

    const safeFileName = cleanFileName(req.file.originalname);
    const uniqueId = crypto.randomUUID();

    const key = `feed/images/${Date.now()}-${uniqueId}-${safeFileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    const url = cloudFrontUrl
      ? `${cloudFrontUrl.replace(/\/$/, "")}/${key}`
      : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return res.status(201).json({
      success: true,
      message: "Feed image uploaded successfully.",
      attachment: {
        type: "image",
        title: req.file.originalname,
        url,
        key,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });
  } catch (error) {
    console.error("UPLOAD_FEED_IMAGE_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Unable to upload feed image.",
    });
  }
};
