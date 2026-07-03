import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { getCloudFrontPrivateKey } from "./cloudFrontPrivateKey.util.js";

const normalizeCloudFrontUrl = (url = "") => {
  const cleanUrl = String(url || "")
    .trim()
    .replace(/\/$/, "");

  if (!cleanUrl) return "";

  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl;
  }

  return `https://${cleanUrl}`;
};

const encodeS3KeyForCloudFrontUrl = (key = "") => {
  return String(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
};

export const extractS3KeyFromUrl = (url = "") => {
  try {
    if (!url) return "";

    const parsedUrl = new URL(url);

    return decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
};

export const createCloudFrontVideoSignedUrl = ({
  key,
  expiresInSeconds = 3600,
}) => {
  const cloudFrontUrl = normalizeCloudFrontUrl(process.env.AWS_CLOUDFRONT_URL);
  const keyPairId = process.env.CLOUDFRONT_PUBLIC_KEY_ID;
  const privateKey = getCloudFrontPrivateKey();

  if (!cloudFrontUrl) {
    throw new Error("AWS_CLOUDFRONT_URL is missing in env.");
  }

  if (!keyPairId) {
    throw new Error("CLOUDFRONT_PUBLIC_KEY_ID is missing in env.");
  }

  if (!privateKey) {
    throw new Error("CloudFront private key is missing.");
  }

  if (!key) {
    throw new Error("Video S3 key is missing.");
  }

  const safeKey = encodeS3KeyForCloudFrontUrl(key);
  const unsignedUrl = `${cloudFrontUrl}/${safeKey}`;

  return getSignedUrl({
    url: unsignedUrl,
    keyPairId,
    privateKey,
    dateLessThan: new Date(
      Date.now() + Number(expiresInSeconds) * 1000,
    ).toISOString(),
  });
};
