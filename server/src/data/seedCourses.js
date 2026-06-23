import dotenv from "dotenv";
import mongoose from "mongoose";
import { Course } from "../models/course.model.js";

dotenv.config();

const courses = [
  {
    title: "Complete HTML & CSS Masterclass",
    slug: "complete-html-css-masterclass",
    shortDescription: "Learn how to build beautiful responsive websites from scratch.",
    description:
      "This course teaches HTML, CSS, responsive design, layouts, forms, and real-world landing page structure. Perfect for beginners starting web development.",
    thumbnail:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200",
    instructorName: "VeoLMS Instructor",
    price: 499,
    category: "Frontend",
    level: "Beginner",
    trailerVideoUrl: "https://www.youtube.com/watch?v=qz0aGYrrlhU",
    isFeatured: true,
    isPublished: true,
    sections: [
      {
        title: "HTML & CSS Foundations",
        order: 1,
        lessons: [
          {
            title: "HTML Introduction",
            videoUrl: "https://www.youtube.com/watch?v=qz0aGYrrlhU",
            duration: "12:00",
            isPreview: true,
            order: 1,
          },
          {
            title: "HTML Tags and Structure",
            videoUrl: "https://www.youtube.com/watch?v=UB1O30fR-EE",
            duration: "15:00",
            isPreview: false,
            order: 2,
          },
          {
            title: "CSS Basics",
            videoUrl: "https://www.youtube.com/watch?v=yfoY53QXEnI",
            duration: "20:00",
            isPreview: false,
            order: 3,
          },
          {
            title: "Flexbox Layout",
            videoUrl: "https://www.youtube.com/watch?v=JJSoEo8JSnc",
            duration: "18:00",
            isPreview: false,
            order: 4,
          },
          {
            title: "Responsive Website Project",
            videoUrl: "https://www.youtube.com/watch?v=srvUrASNj0s",
            duration: "25:00",
            isPreview: false,
            order: 5,
          },
        ],
      },
    ],
  },
  {
    title: "JavaScript for Beginners",
    slug: "javascript-for-beginners",
    shortDescription: "Master JavaScript fundamentals with practical examples.",
    description:
      "Learn variables, functions, arrays, objects, DOM manipulation, events, async JavaScript, and project-based JavaScript fundamentals.",
    thumbnail:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200",
    instructorName: "VeoLMS Instructor",
    price: 699,
    category: "JavaScript",
    level: "Beginner",
    trailerVideoUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
    isFeatured: true,
    isPublished: true,
    sections: [
      {
        title: "JavaScript Core Concepts",
        order: 1,
        lessons: [
          {
            title: "JavaScript Introduction",
            videoUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
            duration: "15:00",
            isPreview: true,
            order: 1,
          },
          {
            title: "Variables and Data Types",
            videoUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
            duration: "20:00",
            isPreview: false,
            order: 2,
          },
          {
            title: "Functions",
            videoUrl: "https://www.youtube.com/watch?v=N8ap4k_1QEQ",
            duration: "18:00",
            isPreview: false,
            order: 3,
          },
          {
            title: "Arrays and Objects",
            videoUrl: "https://www.youtube.com/watch?v=R8rmfD9Y5-c",
            duration: "22:00",
            isPreview: false,
            order: 4,
          },
          {
            title: "DOM Manipulation",
            videoUrl: "https://www.youtube.com/watch?v=0ik6X4DJKCc",
            duration: "25:00",
            isPreview: false,
            order: 5,
          },
        ],
      },
    ],
  },
  {
    title: "React.js Complete Course",
    slug: "react-js-complete-course",
    shortDescription: "Build modern frontend applications using React.",
    description:
      "Learn React components, props, state, hooks, routing, API calls, and real-world UI development for modern applications.",
    thumbnail:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200",
    instructorName: "VeoLMS Instructor",
    price: 999,
    category: "React",
    level: "Intermediate",
    trailerVideoUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8",
    isFeatured: true,
    isPublished: true,
    sections: [
      {
        title: "React Fundamentals",
        order: 1,
        lessons: [
          {
            title: "React Introduction",
            videoUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8",
            duration: "20:00",
            isPreview: true,
            order: 1,
          },
          {
            title: "Components and JSX",
            videoUrl: "https://www.youtube.com/watch?v=SqcY0GlETPk",
            duration: "18:00",
            isPreview: false,
            order: 2,
          },
          {
            title: "Props and State",
            videoUrl: "https://www.youtube.com/watch?v=35lXWvCuM8o",
            duration: "22:00",
            isPreview: false,
            order: 3,
          },
          {
            title: "React Hooks",
            videoUrl: "https://www.youtube.com/watch?v=TNhaISOUy6Q",
            duration: "30:00",
            isPreview: false,
            order: 4,
          },
          {
            title: "React Router",
            videoUrl: "https://www.youtube.com/watch?v=Ul3y1LXxzdU",
            duration: "25:00",
            isPreview: false,
            order: 5,
          },
        ],
      },
    ],
  },
];

const seedCourses = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Course.deleteMany();
    await Course.insertMany(courses);

    console.log("Courses seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
};

seedCourses();