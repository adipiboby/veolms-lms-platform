import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";

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

const getPaymentRevenue = async () => {
  const Payment = await getOptionalModel("../models/payment.model.js", "Payment");

  if (!Payment) {
    return {
      totalRevenue: 0,
      totalPaidPayments: 0,
    };
  }

  const result = await Payment.aggregate([
    {
      $match: {
        $or: [
          { status: { $in: ["paid", "success", "completed", "captured"] } },
          { paymentStatus: { $in: ["paid", "success", "completed", "captured"] } },
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
        totalPaidPayments: { $sum: 1 },
      },
    },
  ]);

  let totalRevenue = normalizeMoney(result[0]?.totalRevenue || 0);
  const totalPaidPayments = Number(result[0]?.totalPaidPayments || 0);

  if (totalPaidPayments > 0 && totalRevenue / totalPaidPayments > 1000) {
    totalRevenue = Math.round(totalRevenue / 100);
  }

  return {
    totalRevenue,
    totalPaidPayments,
  };
};

export const getAdminStudents = async (req, res) => {
  try {
    const [
      students,
      totalCourses,
      totalEnrollments,
      paymentRevenue,
      enrollmentStats,
      recentEnrollments,
    ] = await Promise.all([
      User.find({ role: "student" })
        .select("name email role createdAt")
        .sort({ createdAt: -1 })
        .lean(),

      Course.countDocuments(),

      Enrollment.countDocuments(),

      getPaymentRevenue(),

      Enrollment.aggregate([
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
            _id: "$userId",
            totalEnrollments: { $sum: 1 },
            totalSpent: {
              $sum: {
                $ifNull: ["$course.price", 0],
              },
            },
            lastEnrollmentAt: { $max: "$createdAt" },
          },
        },
      ]),

      Enrollment.find()
        .populate("userId", "name email")
        .populate("courseId", "title slug price category")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const enrollmentMap = new Map();

    enrollmentStats.forEach((item) => {
      enrollmentMap.set(String(item._id), {
        totalEnrollments: item.totalEnrollments || 0,
        totalSpent: item.totalSpent || 0,
        lastEnrollmentAt: item.lastEnrollmentAt || null,
      });
    });

    const studentsWithStats = students.map((student) => {
      const stats = enrollmentMap.get(String(student._id)) || {
        totalEnrollments: 0,
        totalSpent: 0,
        lastEnrollmentAt: null,
      };

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        createdAt: student.createdAt,
        totalEnrollments: stats.totalEnrollments,
        totalSpent: stats.totalSpent,
        lastEnrollmentAt: stats.lastEnrollmentAt,
      };
    });

    const cleanRecentEnrollments = recentEnrollments
      .filter((enrollment) => enrollment.userId && enrollment.courseId)
      .map((enrollment) => ({
        _id: enrollment._id,
        student: {
          _id: enrollment.userId._id,
          name: enrollment.userId.name,
          email: enrollment.userId.email,
        },
        course: {
          _id: enrollment.courseId._id,
          title: enrollment.courseId.title,
          slug: enrollment.courseId.slug,
          price: enrollment.courseId.price,
          category: enrollment.courseId.category,
        },
        createdAt: enrollment.createdAt,
      }));

    const overview = {
      totalStudents: students.length,
      totalCourses,
      totalEnrollments,
      totalRevenue: paymentRevenue.totalRevenue,
      totalPaidPayments: paymentRevenue.totalPaidPayments,
    };

    return res.status(200).json({
      success: true,
      overview,
      stats: overview,
      students: studentsWithStats,
      recentEnrollments: cleanRecentEnrollments,
    });
  } catch (error) {
    console.error("GET_ADMIN_STUDENTS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load admin students",
      error: error.message,
    });
  }
};