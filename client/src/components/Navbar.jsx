import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LEARNING_COURSE_TITLE_KEY = "veolms_current_learning_course_title";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const isLearningPage = location.pathname.startsWith("/learn/");

  const [learningCourseTitle, setLearningCourseTitle] = useState(() => {
    return localStorage.getItem(LEARNING_COURSE_TITLE_KEY) || "";
  });

  useEffect(() => {
    const handleLearningCourseChange = (event) => {
      setLearningCourseTitle(event.detail?.title || "");
    };

    window.addEventListener(
      "veolms-learning-course-change",
      handleLearningCourseChange,
    );

    if (!isLearningPage) {
      setLearningCourseTitle("");
    } else {
      setLearningCourseTitle(
        localStorage.getItem(LEARNING_COURSE_TITLE_KEY) || "",
      );
    }

    return () => {
      window.removeEventListener(
        "veolms-learning-course-change",
        handleLearningCourseChange,
      );
    };
  }, [isLearningPage, location.pathname]);

  const linkClass = ({ isActive }) =>
    isActive
      ? "text-white bg-white/10 border border-white/10"
      : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const dashboardPath =
    user?.role === "admin" ? "/admin/dashboard" : "/student/dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
            <GraduationCap size={22} className="text-white" />
          </div>

          <div className="min-w-0">
            {isLearningPage ? (
              <>
                <h1 className="max-w-[520px] truncate text-lg font-black tracking-tight text-white">
                  {learningCourseTitle || "Learning"}
                </h1>

                <p className="-mt-1 text-xs text-slate-400">
                  VeoLMS Learning Mode
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-black tracking-tight text-white">
                  VeoLMS
                </h1>

                <p className="-mt-1 text-xs text-slate-400">
                  Learning Platform
                </p>
              </>
            )}
          </div>
        </Link>

        <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 md:flex">
          <NavLink
            to="/"
            className={`${linkClass} rounded-xl px-4 py-2 text-sm font-medium`}
          >
            Home
          </NavLink>

          <NavLink
            to="/courses"
            className={`${linkClass} rounded-xl px-4 py-2 text-sm font-medium`}
          >
            Courses
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to={dashboardPath}
              className={`${linkClass} rounded-xl px-4 py-2 text-sm font-medium`}
            >
              Dashboard
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs capitalize text-slate-400">
                  {user?.role}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-red-500/20 hover:text-red-200"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden px-4 py-2 text-slate-300 hover:text-white sm:inline-flex"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
              >
                Join Free
              </Link>
            </>
          )}

          <button className="rounded-xl border border-white/10 bg-white/10 p-2 text-white md:hidden">
            <Menu size={22} />
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
