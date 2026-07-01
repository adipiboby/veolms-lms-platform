import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

const getBucketName = () => {
  return (
    process.env.AWS_S3_BUCKET ||
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.S3_BUCKET_NAME ||
    process.env.S3_BUCKET
  );
};

export const deleteS3ObjectsByKeys = async (keys = []) => {
  try {
    const bucketName = getBucketName();

    if (!bucketName) {
      console.warn("S3 cleanup skipped: bucket name missing.");
      return;
    }

    const cleanKeys = [...new Set(keys)]
      .filter(Boolean)
      .map((key) => String(key).trim())
      .filter((key) => key.length > 0);

    if (cleanKeys.length === 0) return;

    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: cleanKeys.map((key) => ({ Key: key })),
          Quiet: true,
        },
      }),
    );

    console.log(`S3 cleanup completed for ${cleanKeys.length} object(s).`);
  } catch (error) {
    console.error("S3_CLEANUP_ERROR:", error);
  }
};

export const getAttachmentKeys = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .map((attachment) => attachment?.key)
    .filter(Boolean)
    .map((key) => String(key).trim());
};
