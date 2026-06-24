import { z } from "zod";

const isValidVideoSource = (value) => {
  if (!value) return false;

  const trimmedValue = value.trim();

  const isUrl =
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://");

  if (isUrl) {
    return z.string().url().safeParse(trimmedValue).success;
  }

  const isSafeS3Key =
    !trimmedValue.startsWith("/") &&
    !trimmedValue.includes("..") &&
    /^[a-zA-Z0-9._\-/]+$/.test(trimmedValue);

  const hasVideoExtension = /\.(mp4|webm|mov|m3u8)$/i.test(trimmedValue);

  return isSafeS3Key && hasVideoExtension;
};

const lessonSchema = z.object({
  title: z.string().min(2, "Lesson title is required"),
  videoUrl: z
  .string()
  .trim()
  .min(1, "Lesson video source is required")
  .refine(isValidVideoSource, {
    message:
      "Lesson video must be a valid URL or S3 key like courses/videos/lesson-1.mp4",
  }),
  duration: z.string().optional(),
  isPreview: z.boolean().optional(),
  order: z.number().min(1),
});

const sectionSchema = z.object({
  title: z.string().min(2, "Section title is required"),
  order: z.number().min(1),
  lessons: z.array(lessonSchema).optional(),
});

export const createCourseSchema = z.object({
  title: z.string().min(3, "Course title is required"),
  shortDescription: z.string().min(10, "Short description is required"),
  description: z.string().min(20, "Description is required"),
  thumbnail: z.string().url("Valid thumbnail URL is required"),
  instructorName: z.string().min(2, "Instructor name is required"),
  price: z.number().min(0),
  category: z.string().min(2, "Category is required"),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  trailerVideoUrl: z.string().url("Valid trailer video URL is required"),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sections: z.array(sectionSchema).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();
