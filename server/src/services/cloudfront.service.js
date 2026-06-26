import fs from "fs";
import path from "path";
import { getSignedCookies } from "@aws-sdk/cloudfront-signer";

const getCloudFrontPrivateKey = () => {
  if (process.env.CLOUDFRONT_PRIVATE_KEY) {
    return process.env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, "\n");
  }

  const privateKeyPath =
    process.env.CLOUDFRONT_PRIVATE_KEY_PATH ||
    "keys/cloudfront-private-key.pem";

  const fullPath = path.resolve(process.cwd(), privateKeyPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`CloudFront private key not found at: ${fullPath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
};

const normalizeKey = (key = "") => {
  return key.replace(/^\/+/, "");
};

export const getHlsPrefixFromManifestKey = (hlsManifestKey) => {
  const cleanKey = normalizeKey(hlsManifestKey);

  const parts = cleanKey.split("/");
  parts.pop();

  return `${parts.join("/")}/`;
};

export const buildCloudFrontVideoUrl = (key) => {
  const domain = process.env.CLOUDFRONT_VIDEO_DOMAIN;

  if (!domain) {
    throw new Error("CLOUDFRONT_VIDEO_DOMAIN is missing in .env");
  }

  return `https://${domain}/${normalizeKey(key)}`;
};

export const createCloudFrontHlsSignedCookies = ({ hlsOutputPrefix }) => {
  const videoDomain = process.env.CLOUDFRONT_VIDEO_DOMAIN;
  const keyPairId =
    process.env.CLOUDFRONT_PUBLIC_KEY_ID ||
    process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!videoDomain) {
    throw new Error("CLOUDFRONT_VIDEO_DOMAIN is missing in .env");
  }

  if (!keyPairId) {
    throw new Error("CLOUDFRONT_PUBLIC_KEY_ID is missing in .env");
  }

  if (!hlsOutputPrefix) {
    throw new Error("hlsOutputPrefix is required");
  }

  const expiresInSeconds = Number(
    process.env.CLOUDFRONT_HLS_COOKIE_EXPIRES_IN || 3600
  );

  const expiresAtEpoch = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const cleanPrefix = normalizeKey(hlsOutputPrefix);

  const resource = `https://${videoDomain}/${cleanPrefix}*`;

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: resource,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime": expiresAtEpoch,
          },
        },
      },
    ],
  });

  const cookies = getSignedCookies({
    keyPairId,
    privateKey: getCloudFrontPrivateKey(),
    policy,
  });

  return {
    cookies,
    resource,
    expiresAt: new Date(expiresAtEpoch * 1000).toISOString(),
    maxAgeMs: expiresInSeconds * 1000,
  };
};

export const setCloudFrontCookiesOnResponse = ({
  res,
  cookies,
  maxAgeMs,
}) => {
  const cookieDomain =
    process.env.CLOUDFRONT_COOKIE_DOMAIN || ".lms.adipi.in";

  const cookieOptions = {
    domain: cookieDomain,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: maxAgeMs,
  };

  res.cookie("CloudFront-Policy", cookies["CloudFront-Policy"], cookieOptions);

  res.cookie(
    "CloudFront-Signature",
    cookies["CloudFront-Signature"],
    cookieOptions
  );

  res.cookie(
    "CloudFront-Key-Pair-Id",
    cookies["CloudFront-Key-Pair-Id"],
    cookieOptions
  );
};

export const clearCloudFrontCookies = (res) => {
  const cookieDomain =
    process.env.CLOUDFRONT_COOKIE_DOMAIN || ".lms.adipi.in";

  const cookieOptions = {
    domain: cookieDomain,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  };

  res.clearCookie("CloudFront-Policy", cookieOptions);
  res.clearCookie("CloudFront-Signature", cookieOptions);
  res.clearCookie("CloudFront-Key-Pair-Id", cookieOptions);
};