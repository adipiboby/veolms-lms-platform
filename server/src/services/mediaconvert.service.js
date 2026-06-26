import {
  CreateJobCommand,
  DescribeEndpointsCommand,
  GetJobCommand,
  MediaConvertClient,
} from "@aws-sdk/client-mediaconvert";
const region = process.env.AWS_REGION || "us-east-1";

let cachedEndpoint = "";
let cachedMediaConvertClient = null;

const getBucketName = () => {
  const bucket = process.env.AWS_S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME is missing in .env");
  }

  return bucket;
};

const getMediaConvertRoleArn = () => {
  const roleArn = process.env.MEDIACONVERT_ROLE_ARN;

  if (!roleArn) {
    throw new Error("MEDIACONVERT_ROLE_ARN is missing in .env");
  }

  return roleArn;
};

const getAwsCredentials = () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return undefined;
  }

  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
};

export const getMediaConvertJobStatus = async (jobId) => {
  if (!jobId) {
    throw new Error("MediaConvert jobId is required");
  }

  const client = await getMediaConvertClient();

  const result = await client.send(
    new GetJobCommand({
      Id: jobId,
    })
  );

  return {
    jobId: result.Job?.Id,
    status: result.Job?.Status,
    errorCode: result.Job?.ErrorCode,
    errorMessage: result.Job?.ErrorMessage,
  };
};

const normalizeKey = (key = "") => {
  return key.replace(/^\/+/, "");
};

const ensureTrailingSlash = (value = "") => {
  const clean = normalizeKey(value);

  if (!clean) {
    return "";
  }

  return clean.endsWith("/") ? clean : `${clean}/`;
};

const getBaseMediaConvertClient = () => {
  return new MediaConvertClient({
    region,
    credentials: getAwsCredentials(),
  });
};

const getMediaConvertEndpoint = async () => {
  if (process.env.MEDIACONVERT_ENDPOINT) {
    return process.env.MEDIACONVERT_ENDPOINT;
  }

  if (cachedEndpoint) {
    return cachedEndpoint;
  }

  const baseClient = getBaseMediaConvertClient();

  const result = await baseClient.send(
    new DescribeEndpointsCommand({
      MaxResults: 1,
    })
  );

  const endpoint = result.Endpoints?.[0]?.Url;

  if (!endpoint) {
    throw new Error("Could not discover MediaConvert endpoint");
  }

  cachedEndpoint = endpoint;

  return endpoint;
};

export const getMediaConvertClient = async () => {
  if (cachedMediaConvertClient) {
    return cachedMediaConvertClient;
  }

  const endpoint = await getMediaConvertEndpoint();

  cachedMediaConvertClient = new MediaConvertClient({
    region,
    endpoint,
    credentials: getAwsCredentials(),
  });

  return cachedMediaConvertClient;
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

export const createHlsMediaConvertJob = async ({
  inputKey,
  hlsOutputPrefix,
  videoAssetId,
  courseId,
  lessonId,
}) => {
  if (!inputKey) {
    throw new Error("inputKey is required for MediaConvert job");
  }

  if (!hlsOutputPrefix) {
    throw new Error("hlsOutputPrefix is required for MediaConvert job");
  }

  const bucket = getBucketName();
  const roleArn = getMediaConvertRoleArn();
  const client = await getMediaConvertClient();

  const cleanInputKey = normalizeKey(inputKey);
  const cleanOutputPrefix = ensureTrailingSlash(hlsOutputPrefix);

  const inputS3Url = `s3://${bucket}/${cleanInputKey}`;

  /**
   * Important:
   * Destination is WITHOUT .m3u8 extension.
   * MediaConvert will create:
   * courses/hls/.../master.m3u8
   */
  const hlsDestination = `s3://${bucket}/${cleanOutputPrefix}master`;

  const expectedManifestKey = buildHlsManifestKey(cleanOutputPrefix);

  const command = new CreateJobCommand({
    Role: roleArn,

    UserMetadata: {
      app: "veolms",
      videoAssetId: String(videoAssetId || ""),
      courseId: String(courseId || ""),
      lessonId: String(lessonId || ""),
      inputKey: cleanInputKey,
      hlsManifestKey: expectedManifestKey,
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
            {
              NameModifier: "_720p",

              ContainerSettings: {
                Container: "M3U8",
                M3u8Settings: {},
              },

              VideoDescription: {
                Width: 1280,
                Height: 720,
                ScalingBehavior: "DEFAULT",
                Sharpness: 50,

                CodecSettings: {
                  Codec: "H_264",

                  H264Settings: {
                    RateControlMode: "QVBR",
                    MaxBitrate: 3000000,
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
                      Bitrate: 128000,
                      CodingMode: "CODING_MODE_2_0",
                      SampleRate: 48000,
                      CodecProfile: "LC",
                      RateControlMode: "CBR",
                    },
                  },
                },
              ],
            },

            {
              NameModifier: "_480p",

              ContainerSettings: {
                Container: "M3U8",
                M3u8Settings: {},
              },

              VideoDescription: {
                Width: 854,
                Height: 480,
                ScalingBehavior: "DEFAULT",
                Sharpness: 50,

                CodecSettings: {
                  Codec: "H_264",

                  H264Settings: {
                    RateControlMode: "QVBR",
                    MaxBitrate: 1200000,
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
                      Bitrate: 96000,
                      CodingMode: "CODING_MODE_2_0",
                      SampleRate: 48000,
                      CodecProfile: "LC",
                      RateControlMode: "CBR",
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  });

  const result = await client.send(command);

  return {
    jobId: result.Job?.Id,
    jobStatus: result.Job?.Status,
    inputKey: cleanInputKey,
    hlsOutputPrefix: cleanOutputPrefix,
    hlsManifestKey: expectedManifestKey,
    hlsDestination,
  };
};