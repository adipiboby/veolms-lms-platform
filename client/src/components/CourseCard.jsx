import { Link } from "react-router-dom";
import { Star, Clock, Users, PlayCircle } from "lucide-react";

const CourseCard = ({ course }) => {
  const lessonsCount =
    course.sections?.reduce(
      (total, section) => total + (section.lessons?.length || 0),
      0
    ) || 0;

  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group relative overflow-hidden rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 opacity-0 group-hover:opacity-100" />

      <div className="relative">
        <div className="relative h-48 overflow-hidden">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />

          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold backdrop-blur">
              {course.category}
            </span>
          </div>

          <div className="absolute bottom-4 right-4 h-11 w-11 rounded-full bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center text-white">
            <PlayCircle size={24} />
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
            <span>{course.level}</span>
            <span>•</span>
            <span>{lessonsCount} lessons</span>
          </div>

          <h3 className="text-xl font-black text-white mb-3 line-clamp-2 group-hover:text-blue-200">
            {course.title}
          </h3>

          <p className="text-slate-400 text-sm mb-5 line-clamp-2">
            {course.shortDescription}
          </p>

          <p className="text-sm text-slate-300 mb-5">
            By <span className="text-white font-semibold">{course.instructorName}</span>
          </p>

          <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
            <span className="flex items-center gap-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              4.8
            </span>

            <span className="flex items-center gap-1">
              <Users size={16} />
              1.2k
            </span>

            <span className="flex items-center gap-1">
              <Clock size={16} />
              6h
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white">
              ₹{course.price}
            </span>

            <span className="px-4 py-2 rounded-xl bg-white text-slate-950 text-sm font-bold group-hover:bg-blue-600 group-hover:text-white">
              View Course
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;