import { z } from "zod";

const lessonSchema = z.object({
  title: z.string().min(2, "Lesson title is required"),
  videoUrl: z.string().url("Valid lesson video URL is required"),
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