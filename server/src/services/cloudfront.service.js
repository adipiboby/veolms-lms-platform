import { getSignedCookies } from "@aws-sdk/cloudfront-signer";
import { getCloudFrontPrivateKey } from "../utils/cloudFrontPrivateKey.util.js";

const normalizeKey = (key = "") => {
  return String(key || "").replace(/^\/+/, "");
};

const normalizeBoolean = (value) => {
  return String(value || "").toLowerCase() === "true";
};

const isLocalDevHlsPublic = () => {
  return normalizeBoolean(process.env.CLOUDFRONT_HLS_LOCAL_DEV_PUBLIC);
};

const normalizeCloudFrontDomain = () => {
  const rawDomain =
    process.env.CLOUDFRONT_VIDEO_DOMAIN || process.env.AWS_CLOUDFRONT_URL || "";

  const cleanDomain = String(rawDomain)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!cleanDomain) {
    throw new Error(
      "CloudFront domain is missing. Set CLOUDFRONT_VIDEO_DOMAIN or AWS_CLOUDFRONT_URL.",
    );
  }

  return cleanDomain;
};

export const getHlsPrefixFromManifestKey = (hlsManifestKey) => {
  const cleanKey = normalizeKey(hlsManifestKey);

  const parts = cleanKey.split("/");
  parts.pop();

  return `${parts.join("/")}/`;
};

export const buildCloudFrontVideoUrl = (key) => {
  const domain = normalizeCloudFrontDomain();

  return `https://${domain}/${normalizeKey(key)}`;
};

export const createCloudFrontHlsSignedCookies = ({ hlsOutputPrefix }) => {
  const videoDomain = normalizeCloudFrontDomain();

  const keyPairId =
    process.env.CLOUDFRONT_PUBLIC_KEY_ID || process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!keyPairId) {
    throw new Error("CLOUDFRONT_PUBLIC_KEY_ID is missing.");
  }

  if (!hlsOutputPrefix) {
    throw new Error("hlsOutputPrefix is required.");
  }

  const expiresInSeconds = Number(
    process.env.CLOUDFRONT_HLS_COOKIE_EXPIRES_IN || 3600,
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

export const setCloudFrontCookiesOnResponse = ({ res, cookies, maxAgeMs }) => {
  if (isLocalDevHlsPublic()) {
    console.log("CLOUDFRONT_HLS_COOKIE_SKIPPED_LOCAL_DEV_PUBLIC_MODE");
    return;
  }

  const cookieDomain = process.env.CLOUDFRONT_COOKIE_DOMAIN || undefined;

  const cookieOptions = {
    domain: cookieDomain,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: maxAgeMs,
  };

  res.cookie("CloudFront-Policy", cookies["CloudFront-Policy"], cookieOptions);

  res.cookie(
    "CloudFront-Signature",
    cookies["CloudFront-Signature"],
    cookieOptions,
  );

  res.cookie(
    "CloudFront-Key-Pair-Id",
    cookies["CloudFront-Key-Pair-Id"],
    cookieOptions,
  );
};

export const clearCloudFrontCookies = (res) => {
  const cookieDomain = process.env.CLOUDFRONT_COOKIE_DOMAIN || undefined;

  const cookieOptions = {
    domain: cookieDomain,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  res.clearCookie("CloudFront-Policy", cookieOptions);
  res.clearCookie("CloudFront-Signature", cookieOptions);
  res.clearCookie("CloudFront-Key-Pair-Id", cookieOptions);
};

export const getCloudFrontHlsMode = () => {
  if (isLocalDevHlsPublic()) {
    return "local-dev-public-hls";
  }

  return "signed-cookie-hls";
};
