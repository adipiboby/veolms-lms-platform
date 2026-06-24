import crypto from "crypto";
import { Certificate } from "../models/certificate.model.js";
import { Course } from "../models/course.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { LessonProgress } from "../models/lessonProgress.model.js";

const generateCertificateId = () => {
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `VEO-${year}-${randomPart}`;
};

const getCourseLessonCount = (course) => {
  if (!course?.sections?.length) return 0;

  return course.sections.reduce((total, section) => {
    return total + (section.lessons?.length || 0);
  }, 0);
};

export const generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    const totalLessons = getCourseLessonCount(course);

    if (totalLessons === 0) {
      return res.status(400).json({
        success: false,
        message: "This course has no lessons",
      });
    }

    const completedLessons = await LessonProgress.countDocuments({
      userId: req.user._id,
      courseId: course._id,
      isCompleted: true,
    });

    if (completedLessons < totalLessons) {
      return res.status(400).json({
        success: false,
        message: "Complete all lessons before generating certificate",
        progress: {
          completedLessons,
          totalLessons,
          progressPercentage: Math.round((completedLessons / totalLessons) * 100),
        },
      });
    }

    const existingCertificate = await Certificate.findOne({
      userId: req.user._id,
      courseId: course._id,
    });

    if (existingCertificate) {
      return res.status(200).json({
        success: true,
        message: "Certificate already generated",
        certificate: existingCertificate,
      });
    }

    let certificateId = generateCertificateId();

    const existingId = await Certificate.findOne({ certificateId });

    if (existingId) {
      certificateId = generateCertificateId();
    }

    const certificate = await Certificate.create({
      certificateId,
      userId: req.user._id,
      courseId: course._id,
      studentName: req.user.name,
      courseTitle: course.title,
      instructorName: course.instructorName || "",
      completedLessons,
      totalLessons,
    });

    res.status(201).json({
      success: true,
      message: "Certificate generated successfully",
      certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate certificate",
      error: error.message,
    });
  }
};

export const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({
      userId: req.user._id,
      status: "active",
    }).sort({ issuedAt: -1 });

    res.status(200).json({
      success: true,
      certificates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch certificates",
      error: error.message,
    });
  }
};

export const getCertificateForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const certificate = await Certificate.findOne({
      userId: req.user._id,
      courseId,
      status: "active",
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found for this course",
      });
    }

    res.status(200).json({
      success: true,
      certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch certificate",
      error: error.message,
    });
  }
};

export const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({
      certificateId,
      status: "active",
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found or revoked",
        verified: false,
      });
    }

    res.status(200).json({
      success: true,
      verified: true,
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.studentName,
        courseTitle: certificate.courseTitle,
        instructorName: certificate.instructorName,
        issuedAt: certificate.issuedAt,
        completedLessons: certificate.completedLessons,
        totalLessons: certificate.totalLessons,
        status: certificate.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to verify certificate",
      error: error.message,
    });
  }
};