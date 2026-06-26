import mongoose from "mongoose";

import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Review } from "../models/review.model.js";

const getOptionalModel = async (path, exportName) => {
  try {
    const module = await import(path);
    return module[exportName] || module.default || null;
  } catch {
    return null;
  }
};

const normalizeMoney = (amount) => {
  const value = Number(amount || 0);

  if (!Number.isFinite(value)) return 0;

  return Math.round(value);
};

const getRevenueFromEnrollments = async () => {
  const result = await Enrollment.aggregate([
    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
        as: "course",
      },
    },
    {
      $unwind: {
        path: "$course",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: null,
        revenue: {
          $sum: {
            $ifNull: ["$course.price", 0],
          },
        },
      },
    },
  ]);

  return normalizeMoney(result[0]?.revenue || 0);
};

const getRevenueFromPayments = async () => {
  const Payment = await getOptionalModel("../models/payment.model.js", "Payment");

  if (!Payment) {
    return {
      hasPaymentModel: false,
      totalRevenue: 0,
      totalPayments: 0,
    };
  }

  const result = await Payment.aggregate([
    {
      $match: {
        $or: [
          { status: { $in: ["paid", "success", "completed", "captured"] } },
          {
            paymentStatus: {
              $in: ["paid", "success", "completed", "captured"],
            },
          },
          { razorpay_payment_id: { $exists: true, $ne: null } },
          { razorpayPaymentId: { $exists: true, $ne: null } },
        ],
      },
    },
    {
      $addFields: {
        normalizedAmount: {
          $ifNull: [
            "$amount",
            {
              $ifNull: [
                "$paidAmount",
                {
                  $ifNull: ["$coursePrice", 0],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$normalizedAmount" },
        totalPayments: { $sum: 1 },
      },
    },
  ]);

  let totalRevenue = normalizeMoney(result[0]?.totalRevenue || 0);
  const totalPayments = Number(result[0]?.totalPayments || 0);

  // Razorpay sometimes stores amount in paise. This safely converts common paise values.
  if (totalPayments > 0 && totalRevenue / totalPayments > 1000) {
    totalRevenue = Math.round(totalRevenue / 100);
  }

  return {
    hasPaymentModel: true,
    totalRevenue,
    totalPayments,
  };
};

const getVideoCount = async () => {
  const VideoAsset = await getOptionalModel(
    "../models/videoAsset.model.js",
    "VideoAsset"
  );

  if (!VideoAsset) return 0;

  return VideoAsset.countDocuments();
};

export const getAdminAnalytics = async (req, res) => {
  try {
    const [
      totalStudents,
      totalAdmins,
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      totalReviews,
      reviewStats,
      estimatedRevenue,
      paymentAnalytics,
      totalVideos,
      topCourses,
      recentEnrollments,
      recentReviews,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "admin" }),

      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Course.countDocuments({ isPublished: false }),

      Enrollment.countDocuments(),

      Review.countDocuments(),

      Review.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
          },
        },
      ]),

      getRevenueFromEnrollments(),
      getRevenueFromPayments(),
      getVideoCount(),

      Enrollment.aggregate([
        {
          $group: {
            _id: "$courseId",
            enrollments: { $sum: 1 },
          },
        },
        {
          $sort: {
            enrollments: -1,
          },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "course",
          },
        },
        {
          $unwind: {
            path: "$course",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            courseId: "$_id",
            title: "$course.title",
            slug: "$course.slug",
            category: "$course.category",
            level: "$course.level",
            price: "$course.price",
            enrollments: 1,
          },
        },
      ]),

      Enrollment.find()
        .populate("userId", "name email role")
        .populate("courseId", "title slug price category")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      Review.find()
        .populate("userId", "name email")
        .populate("courseId", "title slug")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const averageRating = reviewStats[0]?.averageRating
      ? Number(reviewStats[0].averageRating.toFixed(1))
      : 0;

    const totalRevenue =
      paymentAnalytics.totalRevenue > 0
        ? paymentAnalytics.totalRevenue
        : estimatedRevenue;

    return res.status(200).json({
      success: true,
      analytics: {
        totals: {
          totalStudents,
          totalAdmins,
          totalCourses,
          publishedCourses,
          draftCourses,
          totalEnrollments,
          totalRevenue,
          estimatedRevenue,
          totalPayments: paymentAnalytics.totalPayments,
          totalReviews,
          averageRating,
          totalVideos,
        },

        topCourses,

        recentEnrollments: recentEnrollments.map((enrollment) => ({
          _id: enrollment._id,
          student: enrollment.userId
            ? {
                _id: enrollment.userId._id,
                name: enrollment.userId.name,
                email: enrollment.userId.email,
              }
            : null,
          course: enrollment.courseId
            ? {
                _id: enrollment.courseId._id,
                title: enrollment.courseId.title,
                slug: enrollment.courseId.slug,
                price: enrollment.courseId.price,
                category: enrollment.courseId.category,
              }
            : null,
          createdAt: enrollment.createdAt,
        })),

        recentReviews: recentReviews.map((review) => ({
          _id: review._id,
          rating: review.rating,
          comment: review.comment,
          student: review.userId
            ? {
                _id: review.userId._id,
                name: review.userId.name,
                email: review.userId.email,
              }
            : null,
          course: review.courseId
            ? {
                _id: review.courseId._id,
                title: review.courseId.title,
                slug: review.courseId.slug,
              }
            : null,
          createdAt: review.createdAt,
        })),

        meta: {
          revenueSource:
            paymentAnalytics.totalRevenue > 0 ? "payments" : "enrollments",
          hasPaymentModel: paymentAnalytics.hasPaymentModel,
        },
      },
    });
  } catch (error) {
    console.error("GET_ADMIN_ANALYTICS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load admin analytics",
      error: error.message,
    });
  }
};