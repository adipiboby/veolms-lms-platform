import { z } from "zod";

const isValidVideoSource = (value) => {
  if (!value) return true;

  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) return true;

  const isUrl =
    trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://");

  if (isUrl) {
    return z.string().url().safeParse(trimmedValue).success;
  }

  const isSafeS3Key =
    !trimmedValue.startsWith("/") &&
    !trimmedValue.includes("..") &&
    /^[a-zA-Z0-9._\-/]+$/.test(trimmedValue);

  const hasVideoExtension = /\.(mp4|webm|mov|m3u8|ts)$/i.test(trimmedValue);

  return isSafeS3Key && hasVideoExtension;
};

const objectIdStringSchema = z
  .union([
    z.string().trim(),
    z
      .object({
        _id: z.string().optional(),
      })
      .passthrough(),
    z.null(),
  ])
  .optional();

const resourceSchema = z
  .object({
    _id: z.any().optional(),
    title: z.string().trim().optional().default(""),
    fileName: z.string().trim().optional().default(""),
    fileKey: z.string().trim().optional().default(""),
    mimeType: z.string().trim().optional().default(""),
    size: z.number().optional().default(0),
    type: z
      .enum(["pdf", "zip", "doc", "ppt", "image", "video", "audio", "other"])
      .optional()
      .default("other"),
    uploadedBy: objectIdStringSchema,
    uploadedAt: z.any().optional(),
  })
  .passthrough();

const lessonSchema = z
  .object({
    _id: z.any().optional(),

    title: z.string().trim().min(1, "Lesson title is required"),

    videoUrl: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine(isValidVideoSource, {
        message:
          "Lesson video must be a valid URL or S3 key like courses/videos/lesson-1.mp4",
      }),

    videoKey: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine(isValidVideoSource, {
        message: "Lesson video key must be a valid S3 key",
      }),

    videoAssetId: objectIdStringSchema,

    hlsManifestKey: z.string().trim().optional().default(""),

    hlsOutputPrefix: z.string().trim().optional().default(""),

    duration: z.string().trim().optional().default(""),

    durationSeconds: z.number().optional().default(0),

    originalVideoName: z.string().trim().optional().default(""),

    sizeBytes: z.number().optional().default(0),

    mimeType: z.string().trim().optional().default(""),

    description: z.string().optional().default(""),

    isPreview: z.boolean().optional().default(false),

    order: z.number().min(1),

    resources: z.array(resourceSchema).optional().default([]),
  })
  .passthrough();

const sectionSchema = z
  .object({
    _id: z.any().optional(),

    title: z.string().trim().min(1, "Section title is required"),

    order: z.number().min(1),

    lessons: z.array(lessonSchema).optional().default([]),
  })
  .passthrough();

export const createCourseSchema = z.object({
  title: z.string().trim().min(3, "Course title is required"),

  shortDescription: z.string().trim().min(10, "Short description is required"),

  description: z.string().trim().min(20, "Description is required"),

  thumbnail: z.string().trim().url("Valid thumbnail URL is required"),

  instructorName: z.string().trim().min(2, "Instructor name is required"),

  price: z.number().min(0),

  category: z.string().trim().min(2, "Category is required"),

  level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),

  trailerVideoUrl: z.string().trim().url("Valid trailer video URL is required"),

  isFeatured: z.boolean().optional(),

  isPublished: z.boolean().optional(),

  sections: z.array(sectionSchema).optional().default([]),
});

export const updateCourseSchema = createCourseSchema.partial();
