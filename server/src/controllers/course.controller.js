import slugify from "slugify";
import { Course } from "../models/course.model.js";

const createUniqueSlug = async (title, courseIdToExclude = null) => {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  let slug = baseSlug;
  let count = 1;

  while (true) {
    const query = { slug };

    if (courseIdToExclude) {
      query._id = { $ne: courseIdToExclude };
    }

    const existingCourse = await Course.findOne(query);

    if (!existingCourse) {
      return slug;
    }

    slug = `${baseSlug}-${count}`;
    count += 1;
  }
};

const isSuperAdmin = (user) => user?.role === "superAdmin";

const isCourseOwner = (course, user) => {
  if (!course?.createdBy || !user?._id) return false;
  return course.createdBy.toString() === user._id.toString();
};

export const getAllCourses = async (req, res) => {
  try {
    const { search } = req.query;

    const query = { isPublished: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { instructorName: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};

export const getAdminCourses = async (req, res) => {
  try {
    const query = isSuperAdmin(req.user)
      ? {}
      : {
          createdBy: req.user._id,
        };

    const courses = await Course.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin courses",
      error: error.message,
    });
  }
};

export const getFeaturedCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      isPublished: true,
      isFeatured: true,
    }).limit(6);

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured courses",
      error: error.message,
    });
  }
};

export const getCourseBySlug = async (req, res) => {
  try {
    const course = await Course.findOne({
      slug: req.params.slug,
      isPublished: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course",
      error: error.message,
    });
  }
};

export const createCourse = async (req, res) => {
  try {
    const slug = await createUniqueSlug(req.body.title);

    const course = await Course.create({
      ...req.body,
      slug,
      createdBy: req.user._id,
      sections: req.body.sections || [],
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!isSuperAdmin(req.user) && !isCourseOwner(course, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can update only courses created by you",
      });
    }

    const updateData = { ...req.body };

    delete updateData.createdBy;
    delete updateData.slug;

    if (req.body.title && req.body.title !== course.title) {
      updateData.slug = await createUniqueSlug(req.body.title, course._id);
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update course",
      error: error.message,
    });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!isSuperAdmin(req.user) && !isCourseOwner(course, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can delete only courses created by you",
      });
    }

    await course.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete course",
      error: error.message,
    });
  }
};

export const getAdminCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!isSuperAdmin(req.user) && !isCourseOwner(course, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can view only courses created by you",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course",
      error: error.message,
    });
  }
};