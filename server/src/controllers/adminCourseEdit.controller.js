import mongoose from "mongoose";
import { Course } from "../models/course.model.js";

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const cleanSections = (sections = []) => {
  if (!Array.isArray(sections)) return [];

  return sections.map((section, sectionIndex) => ({
    ...section,
    title: section?.title || "",
    order: Number(section?.order || sectionIndex + 1),
    lessons: Array.isArray(section?.lessons)
      ? section.lessons.map((lesson, lessonIndex) => ({
          ...lesson,
          title: lesson?.title || "",
          duration: lesson?.duration || "",
          order: Number(lesson?.order || lessonIndex + 1),
          isPreview: Boolean(lesson?.isPreview),
          videoUrl: lesson?.videoUrl || lesson?.lessonUrl || "",
          videoKey: lesson?.videoKey || lesson?.fileKey || "",
          description: lesson?.description || "",
          resources: Array.isArray(lesson?.resources) ? lesson.resources : [],
        }))
      : [],
  }));
};

export const getAdminCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id.",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("GET_ADMIN_COURSE_BY_ID_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load course.",
    });
  }
};

export const updateAdminCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id.",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const {
      title,
      slug,
      category,
      instructor,
      level,
      price,
      thumbnail,
      trailer,
      shortDescription,
      description,
      isPublished,
      sections,
    } = req.body;

    course.title = title ?? course.title;
    course.slug = slug ?? course.slug;
    course.category = category ?? course.category;
    course.instructor = instructor ?? course.instructor;
    course.level = level ?? course.level;
    course.price = Number(price ?? course.price ?? 0);
    course.thumbnail = thumbnail ?? course.thumbnail;
    course.trailer = trailer ?? course.trailer;
    course.shortDescription = shortDescription ?? course.shortDescription;
    course.description = description ?? course.description;
    course.isPublished =
      typeof isPublished === "boolean" ? isPublished : course.isPublished;

    if (Array.isArray(sections)) {
      course.sections = cleanSections(sections);
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      course,
    });
  } catch (error) {
    console.error("UPDATE_ADMIN_COURSE_BY_ID_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update course.",
    });
  }
};