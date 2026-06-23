import { Link } from "react-router-dom";
import { Star, Users, Clock } from "lucide-react";

const CourseCard = ({ course }) => {
  const lessonsCount =
    course.sections?.reduce(
      (total, section) => total + section.lessons.length,
      0
    ) || 0;

  return (
    <Link
      to={`/courses/${course.slug}`}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition block"
    >
      <img
        src={course.thumbnail}
        alt={course.title}
        className="h-48 w-full object-cover"
      />

      <div className="p-5">
        <p className="text-sm text-blue-600 font-semibold mb-2">
          {course.category}
        </p>

        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
          {course.title}
        </h3>

        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {course.shortDescription}
        </p>

        <p className="text-sm text-slate-500 mb-4">
          By {course.instructorName}
        </p>

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <Star size={16} className="text-yellow-500" />
            4.8
          </span>

          <span className="flex items-center gap-1">
            <Users size={16} />
            1.2k
          </span>

          <span className="flex items-center gap-1">
            <Clock size={16} />
            {lessonsCount} lessons
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-slate-900">
            ₹{course.price}
          </span>

          <span className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">
            View Course
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;