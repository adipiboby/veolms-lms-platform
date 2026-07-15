import {
  CreateJobCommand,
  GetJobCommand,
  MediaConvertClient,
} from "@aws-sdk/client-mediaconvert";

const mediaConvertRegion =
  process.env.MEDIACONVERT_REGION || process.env.AWS_S3_REGION || "us-east-1";

let cachedMediaConvertClient = null;

const normalizeKey = (key = "") => {
  return String(key || "").replace(/^\/+/, "");
};

const ensureTrailingSlash = (value = "") => {
  const clean = normalizeKey(value);

  if (!clean) {
    return "";
  }

  return clean.endsWith("/") ? clean : `${clean}/`;
};

const normalizeEndpoint = (endpoint = "") => {
  return String(endpoint || "")
    .trim()
    .replace(/\/+$/, "");
};

const getBucketName = () => {
  const bucket = process.env.AWS_S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME is missing in environment variables.");
  }

  return bucket;
};

const getMediaConvertRoleArn = () => {
  const roleArn = process.env.MEDIACONVERT_ROLE_ARN;

  console.log("MEDIACONVERT_ROLE_ENV_CHECK", {
    hasRoleArn: Boolean(roleArn),
    roleArn,
    envKeys: Object.keys(process.env).filter((key) =>
      key.includes("MEDIACONVERT"),
    ),
  });

  if (!roleArn) {
    throw new Error(
      "MEDIACONVERT_ROLE_ARN is missing in environment variables.",
    );
  }

  return roleArn;
};

const getMediaConvertEndpoint = () => {
  const endpoint = normalizeEndpoint(process.env.MEDIACONVERT_ENDPOINT);

  if (!endpoint) {
    throw new Error(
      "MEDIACONVERT_ENDPOINT is missing. Set the exact MediaConvert endpoint for your account/region.",
    );
  }

  return endpoint;
};

export const getMediaConvertClient = () => {
  if (cachedMediaConvertClient) {
    return cachedMediaConvertClient;
  }

  const endpoint = getMediaConvertEndpoint();

  console.log("MEDIACONVERT_CLIENT_CREATE", {
    region: mediaConvertRegion,
    endpoint,
    credentialMode: "default-provider-chain",
  });

  cachedMediaConvertClient = new MediaConvertClient({
    region: mediaConvertRegion,
    endpoint,
  });

  return cachedMediaConvertClient;
};

export const getMediaConvertJobStatus = async (jobId) => {
  if (!jobId) {
    throw new Error("MediaConvert jobId is required.");
  }

  const client = getMediaConvertClient();

  const result = await client.send(
    new GetJobCommand({
      Id: jobId,
    }),
  );

  return {
    jobId: result.Job?.Id || "",
    status: result.Job?.Status || "",
    errorCode: result.Job?.ErrorCode || "",
    errorMessage: result.Job?.ErrorMessage || "",
  };
};

export const buildHlsOutputPrefix = ({ courseSlug, videoAssetId }) => {
  const safeCourseSlug = String(courseSlug || "course")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

  const safeVideoAssetId = String(videoAssetId || Date.now());

  return `courses/hls/${safeCourseSlug}/${safeVideoAssetId}/`;
};

export const buildHlsManifestKey = (hlsOutputPrefix) => {
  const cleanPrefix = ensureTrailingSlash(hlsOutputPrefix);

  return `${cleanPrefix}master.m3u8`;
};

const createHlsOutput = ({
  nameModifier,
  width,
  height,
  maxBitrate,
  audioBitrate,
}) => {
  return {
    NameModifier: nameModifier,

    ContainerSettings: {
      Container: "M3U8",
      M3u8Settings: {},
    },

    VideoDescription: {
      Width: width,
      Height: height,
      ScalingBehavior: "DEFAULT",
      Sharpness: 50,

      CodecSettings: {
        Codec: "H_264",

        H264Settings: {
          RateControlMode: "QVBR",
          MaxBitrate: maxBitrate,
          QvbrSettings: {
            QvbrQualityLevel: 7,
          },
          QualityTuningLevel: "SINGLE_PASS_HQ",
          CodecProfile: "MAIN",
          CodecLevel: "AUTO",
          GopSize: 2,
          GopSizeUnits: "SECONDS",
          GopClosedCadence: 1,
          NumberBFramesBetweenReferenceFrames: 2,
          FramerateControl: "INITIALIZE_FROM_SOURCE",
          SceneChangeDetect: "TRANSITION_DETECTION",
        },
      },
    },

    AudioDescriptions: [
      {
        AudioSourceName: "Audio Selector 1",

        CodecSettings: {
          Codec: "AAC",

          AacSettings: {
            Bitrate: audioBitrate,
            CodingMode: "CODING_MODE_2_0",
            SampleRate: 48000,
            CodecProfile: "LC",
            RateControlMode: "CBR",
          },
        },
      },
    ],
  };
};

export const createHlsMediaConvertJob = async ({
  inputKey,
  hlsOutputPrefix,
  videoAssetId,
  courseId,
  lessonId,
}) => {
  if (!inputKey) {
    throw new Error("inputKey is required for MediaConvert job.");
  }

  if (!hlsOutputPrefix) {
    throw new Error("hlsOutputPrefix is required for MediaConvert job.");
  }

  const bucket = getBucketName();
  const roleArn = getMediaConvertRoleArn();
  const client = getMediaConvertClient();

  const cleanInputKey = normalizeKey(inputKey);
  const cleanOutputPrefix = ensureTrailingSlash(hlsOutputPrefix);

  const inputS3Url = `s3://${bucket}/${cleanInputKey}`;
  const hlsDestination = `s3://${bucket}/${cleanOutputPrefix}master`;
  const expectedManifestKey = buildHlsManifestKey(cleanOutputPrefix);

  console.log("MEDIACONVERT_CREATE_JOB_START", {
    region: mediaConvertRegion,
    bucket,
    roleArn,
    inputS3Url,
    hlsDestination,
    videoAssetId: String(videoAssetId || ""),
    courseId: String(courseId || ""),
    lessonId: String(lessonId || ""),
    hlsManifestKey: expectedManifestKey,
    hlsOutputPrefix: cleanOutputPrefix,
  });

  const command = new CreateJobCommand({
    Role: roleArn,

    UserMetadata: {
      app: "veolms",
      videoAssetId: String(videoAssetId || ""),
      courseId: String(courseId || ""),
      lessonId: String(lessonId || ""),
      inputKey: cleanInputKey,
      hlsManifestKey: expectedManifestKey,
      hlsOutputPrefix: cleanOutputPrefix,
    },

    Settings: {
      TimecodeConfig: {
        Source: "ZEROBASED",
      },

      Inputs: [
        {
          FileInput: inputS3Url,

          VideoSelector: {},

          AudioSelectors: {
            "Audio Selector 1": {
              DefaultSelection: "DEFAULT",
            },
          },
        },
      ],

      OutputGroups: [
        {
          Name: "Apple HLS",

          OutputGroupSettings: {
            Type: "HLS_GROUP_SETTINGS",

            HlsGroupSettings: {
              Destination: hlsDestination,
              SegmentLength: 10,
              MinSegmentLength: 0,
              SegmentControl: "SEGMENTED_FILES",
              OutputSelection: "MANIFESTS_AND_SEGMENTS",
              ClientCache: "ENABLED",
              ManifestDurationFormat: "INTEGER",
              StreamInfResolution: "INCLUDE",
              ProgramDateTime: "EXCLUDE",
            },
          },

          Outputs: [
            createHlsOutput({
              nameModifier: "_720p",
              width: 1280,
              height: 720,
              maxBitrate: 3000000,
              audioBitrate: 128000,
            }),

            createHlsOutput({
              nameModifier: "_480p",
              width: 854,
              height: 480,
              maxBitrate: 1200000,
              audioBitrate: 96000,
            }),

            createHlsOutput({
              nameModifier: "_360p",
              width: 640,
              height: 360,
              maxBitrate: 700000,
              audioBitrate: 64000,
            }),
          ],
        },
      ],
    },
  });

  const result = await client.send(command);

  console.log("MEDIACONVERT_JOB_CREATED", {
    region: mediaConvertRegion,
    jobId: result.Job?.Id,
    jobStatus: result.Job?.Status,
    videoAssetId: String(videoAssetId || ""),
    courseId: String(courseId || ""),
    lessonId: String(lessonId || ""),
    inputKey: cleanInputKey,
    hlsOutputPrefix: cleanOutputPrefix,
    hlsManifestKey: expectedManifestKey,
  });

  return {
    jobId: result.Job?.Id || "",
    jobStatus: result.Job?.Status || "",
    inputKey: cleanInputKey,
    hlsOutputPrefix: cleanOutputPrefix,
    hlsManifestKey: expectedManifestKey,
    hlsDestination,
  };
};
