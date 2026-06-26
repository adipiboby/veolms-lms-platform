import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Course } from "../models/course.model.js";

const DEMO_VIDEO_KEY =
  process.env.DEMO_VIDEO_KEY ||
  "courses/videos/admin-6a3a75d44f203eb9cbfb3b7d/1782285101352-WIN_20260506_15_39_34_Pro.mp4";

const courses = [
  {
    title: "Full Stack MERN Development Masterclass",
    slug: "full-stack-mern-development-masterclass",
    category: "Web Development",
    instructorName: "procodrr",
    price: 999,
    level: "Intermediate",
    thumbnail:
      "https://i.ytimg.com/vi/_rTCzxg6VmM/hqdefault.jpg?sqp=-oaymwEmCKgBEF5IWvKriqkDGQgBFQAAiEIYAdgBAeIBCggYEAIYBjgBQAE=&rs=AOn4CLDqT-fj7cbs6iHuk8Wn5fI4qPopsQ",
    trailerVideoUrl: DEMO_VIDEO_KEY,
    shortDescription:
      "Build production-ready full-stack applications using MongoDB, Express, React, and Node.js.",
    description:
      "Master MERN stack development with real project architecture, authentication, REST APIs, database modeling, frontend integration, protected routes, payments, and deployment-ready practices.",
    isPublished: true,
    isFeatured: true,
    sections: [
      {
        title: "MERN Foundations",
        order: 1,
        lessons: [
          {
            title: "Introduction to MERN Stack Architecture",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "18:00",
            order: 1,
            isPreview: true,
          },
          {
            title: "React and Node Project Setup",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "22:00",
            order: 2,
            isPreview: false,
          },
          {
            title: "Building Express REST APIs",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "25:00",
            order: 3,
            isPreview: false,
          },
          {
            title: "MongoDB Models and Relationships",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "24:00",
            order: 4,
            isPreview: false,
          },
          {
            title: "Connecting React with Backend APIs",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "28:00",
            order: 5,
            isPreview: false,
          },
        ],
      },
    ],
  },

  {
    title: "AWS Cloud Deployment for Developers",
    slug: "aws-cloud-deployment-for-developers",
    category: "Cloud Computing",
    instructorName: "procodrr",
    price: 1299,
    level: "Intermediate",
    thumbnail:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop",
    trailerVideoUrl: DEMO_VIDEO_KEY,
    shortDescription:
      "Deploy modern web applications using AWS, S3, CloudFront, Nginx, PM2, and CI/CD.",
    description:
      "Learn practical cloud deployment for full-stack apps, including Linux server setup, process management, S3 media storage, CloudFront CDN, signed URLs, reverse proxy, and production deployment flow.",
    isPublished: true,
    isFeatured: true,
    sections: [
      {
        title: "AWS Deployment Essentials",
        order: 1,
        lessons: [
          {
            title: "Understanding Cloud Deployment Architecture",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "20:00",
            order: 1,
            isPreview: true,
          },
          {
            title: "Deploying Backend on Linux Server",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "27:00",
            order: 2,
            isPreview: false,
          },
          {
            title: "Running Node Apps with PM2",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "19:00",
            order: 3,
            isPreview: false,
          },
          {
            title: "Serving Frontend with S3 and CloudFront",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "26:00",
            order: 4,
            isPreview: false,
          },
          {
            title: "Securing Course Videos with Signed URLs",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "30:00",
            order: 5,
            isPreview: false,
          },
        ],
      },
    ],
  },

  {
    title: "React Frontend Engineering Pro",
    slug: "react-frontend-engineering-pro",
    category: "Frontend Development",
    instructorName: "procodrr",
    price: 899,
    level: "Beginner",
    thumbnail:
      "https://i.ytimg.com/vi/_rTCzxg6VmM/hqdefault.jpg?sqp=-oaymwEmCKgBEF5IWvKriqkDGQgBFQAAiEIYAdgBAeIBCggYEAIYBjgBQAE=&rs=AOn4CLDqT-fj7cbs6iHuk8Wn5fI4qPopsQ",
    trailerVideoUrl: DEMO_VIDEO_KEY,
    shortDescription:
      "Master React components, routing, forms, API integration, protected routes, and dashboard UI.",
    description:
      "Become strong in React frontend development by learning component structure, routing, forms, validation, API handling, loading states, protected pages, role-based UI, and clean dashboard design.",
    isPublished: true,
    isFeatured: true,
    sections: [
      {
        title: "React Professional Skills",
        order: 1,
        lessons: [
          {
            title: "The Complete React Course",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "08:24",
            order: 1,
            isPreview: true,
          },
          {
            title: "what is jsx |Transform jsx with Babel",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "20:00",
            order: 2,
            isPreview: false,
          },
          {
            title: "Forms, Validation, and User Input",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "23:00",
            order: 3,
            isPreview: false,
          },
          {
            title: "API Integration with Axios",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "24:00",
            order: 4,
            isPreview: false,
          },
          {
            title: "Protected Routes and Dashboard UI",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "29:00",
            order: 5,
            isPreview: false,
          },
        ],
      },
    ],
  },
];

const printValidationError = (error) => {
  if (error?.name === "ValidationError") {
    console.log("\nValidation errors:");

    Object.keys(error.errors).forEach((field) => {
      console.log(`- ${field}: ${error.errors[field].message}`);
    });
  }
};

const seedProfessionalCourses = async () => {
  try {
    console.log("Executing seed file:", import.meta.url);

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in server .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const slugs = courses.map((course) => course.slug);

    await Course.deleteMany({
      slug: { $in: slugs },
    });

    console.log("Old professional courses deleted");

    const createdCourses = [];

    for (const courseData of courses) {
      try {
        const preparedCourse = {
          ...courseData,
          instructorName: courseData.instructorName || "VeoLMS Instructor",
          trailerVideoUrl: courseData.trailerVideoUrl || DEMO_VIDEO_KEY,
        };

        console.log("\nDEBUG COURSE DATA BEFORE CREATE:");
        console.log({
          title: preparedCourse.title,
          instructorName: preparedCourse.instructorName,
          trailerVideoUrl: preparedCourse.trailerVideoUrl,
          keys: Object.keys(preparedCourse),
        });

        const course = await Course.create(preparedCourse);

        createdCourses.push(course);

        console.log(`Created: ${course.title}`);
      } catch (error) {
        console.log(`\nFailed course: ${courseData.title}`);
        printValidationError(error);
        throw error;
      }
    }

    console.log(`\nSeeded ${createdCourses.length} professional courses`);

    createdCourses.forEach((course) => {
      console.log(`- ${course.title}`);
    });

    await mongoose.disconnect();

    console.log("MongoDB disconnected");
    process.exit(0);
  } catch (error) {
    console.error("\nProfessional course seeding failed:");
    console.error(error.message);

    await mongoose.disconnect();
    process.exit(1);
  }
};

seedProfessionalCourses();
