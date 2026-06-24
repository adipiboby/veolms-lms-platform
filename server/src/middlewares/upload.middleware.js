import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads", "videos");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedVideoTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/x-mpegURL",
  "application/vnd.apple.mpegurl",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!allowedVideoTypes.includes(file.mimetype)) {
    return cb(new Error("Only MP4, WebM, MOV, or HLS playlist files are allowed"));
  }

  cb(null, true);
};

export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500 MB
  },
});