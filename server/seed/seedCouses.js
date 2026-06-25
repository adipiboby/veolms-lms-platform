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
    instructor: "VeoLMS Instructor",
    price: 999,
    level: "Intermediate",
    thumbnail:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop",
    trailer: DEMO_VIDEO_KEY,
    shortDescription:
      "Build full-stack production-ready web applications using MongoDB, Express, React, and Node.js.",
    description:
      "This course teaches complete MERN stack development from project setup to authentication, APIs, database design, frontend integration, deployment concepts, and production best practices.",
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
            title: "Setting Up React and Node Project Structure",
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
            title: "Connecting React Frontend with Backend APIs",
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
    instructor: "VeoLMS Instructor",
    price: 1299,
    level: "Intermediate",
    thumbnail:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop",
    trailer: DEMO_VIDEO_KEY,
    shortDescription:
      "Learn how to deploy modern web applications using AWS, S3, CloudFront, Nginx, PM2, and CI/CD.",
    description:
      "This course focuses on practical cloud deployment skills for full-stack developers. You will learn server setup, static hosting, private file delivery, CDN concepts, reverse proxy, process management, and deployment automation.",
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
            title: "Securing Media with Signed URLs",
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
    instructor: "VeoLMS Instructor",
    price: 899,
    level: "Beginner to Intermediate",
    thumbnail:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&auto=format&fit=crop",
    trailer: DEMO_VIDEO_KEY,
    shortDescription:
      "Master React components, routing, state management, API integration, protected routes, and clean UI patterns.",
    description:
      "This course helps students become strong React frontend developers. You will learn component architecture, routing, forms, API communication, role-based UI, loading states, error handling, and professional dashboard design.",
    isPublished: true,
    isFeatured: true,
    sections: [
      {
        title: "React Professional Skills",
        order: 1,
        lessons: [
          {
            title: "React Component Architecture",
            videoUrl: DEMO_VIDEO_KEY,
            duration: "21:00",
            order: 1,
            isPreview: true,
          },
          {
            title: "React Router and Page Navigation",
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

const seedCourses = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const slugs = courses.map((course) => course.slug);

    await Course.deleteMany({
      slug: { $in: slugs },
    });

    const createdCourses = await Course.insertMany(courses);

    console.log(`Seeded ${createdCourses.length} professional courses`);
    console.log("Course slugs:");

    createdCourses.forEach((course) => {
      console.log(`- ${course.slug}`);
    });

    await mongoose.disconnect();

    console.log("MongoDB disconnected");
    process.exit(0);
  } catch (error) {
    console.error("Course seeding failed:", error);

    await mongoose.disconnect();
    process.exit(1);
  }
};

seedCourses();
