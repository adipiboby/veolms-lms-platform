import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { Payment } from "../models/payment.model.js";

export const getAdminOverview = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();
    const paidPayments = await Payment.find({ status: "paid" });

    const totalRevenue = paidPayments.reduce((total, payment) => {
      return total + payment.amount;
    }, 0);

    res.status(200).json({
      success: true,
      overview: {
        totalStudents,
        totalCourses,
        totalEnrollments,
        totalPaidPayments: paidPayments.length,
        totalRevenue: totalRevenue / 100,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin overview",
      error: error.message,
    });
  }
};

export const getAdminStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("name email role createdAt")
      .sort({ createdAt: -1 });

    const enrollments = await Enrollment.find({
      userId: { $in: students.map((student) => student._id) },
    }).select("userId");

    const enrollmentCountByStudent = enrollments.reduce((acc, enrollment) => {
      const userId = enrollment.userId.toString();
      acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {});

    const formattedStudents = students.map((student) => ({
      _id: student._id,
      name: student.name,
      email: student.email,
      role: student.role,
      joinedAt: student.createdAt,
      enrolledCourses: enrollmentCountByStudent[student._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      count: formattedStudents.length,
      students: formattedStudents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
};

export const getAdminEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate({
        path: "userId",
        select: "name email",
      })
      .populate({
        path: "courseId",
        select: "title slug price category",
      })
      .populate({
        path: "paymentId",
        select: "amount currency status razorpayPaymentId createdAt",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments",
      error: error.message,
    });
  }
};