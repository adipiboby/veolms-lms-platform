import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { User } from "../models/user.model.js";
import { VideoAsset } from "../models/videoAsset.model.js";

export const getAdminOverview = async (req, res) => {
  try {
    const [
      totalCourses,
      totalStudents,
      totalAdmins,
      totalEnrollments,
      totalVideos,
      processingVideos,
      readyVideos,
      failedVideos,
      recentCourses,
      recentStudents,
    ] = await Promise.all([
      Course.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "admin" }),
      Enrollment.countDocuments(),
      VideoAsset.countDocuments(),
      VideoAsset.countDocuments({ hlsStatus: "processing" }),
      VideoAsset.countDocuments({ hlsStatus: "ready" }),
      VideoAsset.countDocuments({ hlsStatus: "failed" }),

      Course.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title slug price level category createdAt"),

      User.find({ role: "student" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email role createdAt"),
    ]);

    return res.status(200).json({
      success: true,

      overview: {
        totalCourses,
        totalStudents,
        totalAdmins,
        totalEnrollments,
        totalVideos,
        processingVideos,
        readyVideos,
        failedVideos,
        totalRevenue: 0,
      },

      // extra aliases, useful if frontend expects stats
      stats: {
        totalCourses,
        totalStudents,
        totalAdmins,
        totalEnrollments,
        totalVideos,
        processingVideos,
        readyVideos,
        failedVideos,
        totalRevenue: 0,
      },

      recentCourses,
      recentStudents,
    });
  } catch (error) {
    console.error("ADMIN_OVERVIEW_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load admin overview",
      error: error.message,
    });
  }
};