import fs from "fs";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION || "us-east-1";

export const s3Client = new S3Client({
  region,
  endpoint: `https://s3.${region}.amazonaws.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getBucketName = () => {
  const bucket = process.env.AWS_S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME is missing in .env");
  }

  return bucket;
};

const sanitizeFileName = (fileName = "video.mp4") => {
  return fileName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "")
    .toLowerCase();
};

export const buildVideoKey = ({ courseSlug, adminId, originalName }) => {
  const safeName = sanitizeFileName(originalName);

  if (courseSlug) {
    return `courses/videos/${courseSlug}/${Date.now()}-${safeName}`;
  }

  return `courses/videos/admin-${adminId}/${Date.now()}-${safeName}`;
};

export const createSignedVideoUrl = async (key) => {
  if (!key) {
    throw new Error("S3 video key is required");
  }

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ResponseContentDisposition: "inline",
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: Number(process.env.S3_SIGNED_URL_EXPIRES_IN || 600),
  });
};

export const createPresignedUploadUrl = async ({ key, contentType }) => {
  if (!key) {
    throw new Error("S3 upload key is required");
  }

  if (!contentType) {
    throw new Error("Video content type is required");
  }

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: 15 * 60,
  });
};

export const uploadVideoToS3 = async ({ filePath, key, contentType }) => {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: getBucketName(),
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: contentType,
    },
  });

  await upload.done();

  return {
    bucket: getBucketName(),
    key,
    region,
  };
};

export const initiateMultipartUpload = async ({ key, contentType }) => {
  const command = new CreateMultipartUploadCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  const result = await s3Client.send(command);

  return {
    uploadId: result.UploadId,
    key,
    bucket: getBucketName(),
    region,
  };
};

export const createPresignedPartUploadUrl = async ({
  key,
  uploadId,
  partNumber,
}) => {
  const command = new UploadPartCommand({
    Bucket: getBucketName(),
    Key: key,
    UploadId: uploadId,
    PartNumber: Number(partNumber),
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: 15 * 60,
  });
};

export const completeMultipartUpload = async ({ key, uploadId, parts }) => {
  const sortedParts = parts
    .map((part) => ({
      PartNumber: Number(part.PartNumber),
      ETag: part.ETag,
    }))
    .sort((a, b) => a.PartNumber - b.PartNumber);

  const command = new CompleteMultipartUploadCommand({
    Bucket: getBucketName(),
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: sortedParts,
    },
  });

  const result = await s3Client.send(command);

  return {
    key,
    bucket: getBucketName(),
    region,
    location: result.Location,
    etag: result.ETag,
  };
};

export const abortMultipartUpload = async ({ key, uploadId }) => {
  const command = new AbortMultipartUploadCommand({
    Bucket: getBucketName(),
    Key: key,
    UploadId: uploadId,
  });

  await s3Client.send(command);

  return {
    success: true,
  };
};