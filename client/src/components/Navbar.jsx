import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  UserCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const LEARNING_COURSE_TITLE_KEY = "veolms_current_learning_course_title";

const getProfileImage = (user) => {
  return (
    user?.avatar ||
    user?.photo ||
    user?.profilePhoto ||
    user?.profileImage ||
    user?.picture ||
    ""
  );
};

const getUserName = (user) => {
  return user?.name || user?.email?.split("@")[0] || "User";
};

const getInitial = (name = "") => {
  return String(name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const profileMenuRef = useRef(null);

  const { user, logout, isAuthenticated } = useAuth();

  const isLearningPage = location.pathname.startsWith("/learn/");

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [learningCourseTitle, setLearningCourseTitle] = useState(() => {
    return localStorage.getItem(LEARNING_COURSE_TITLE_KEY) || "";
  });

  const profileImage = getProfileImage(user);
  const userName = getUserName(user);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const linkClass = ({ isActive }) =>
    isActive
      ? "text-white bg-white/10 border border-white/10"
      : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent";

  const handleLogout = async () => {
    setProfileMenuOpen(false);
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
            className={({ isActive }) =>
              `${linkClass({ isActive })} rounded-xl px-4 py-2 text-sm font-medium`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/courses"
            className={({ isActive }) =>
              `${linkClass({ isActive })} rounded-xl px-4 py-2 text-sm font-medium`
            }
          >
            Courses
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to={dashboardPath}
              className={({ isActive }) =>
                `${linkClass({ isActive })} rounded-xl px-4 py-2 text-sm font-medium`
              }
            >
              Dashboard
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 py-1 pl-1 pr-3 text-white transition hover:bg-white/15"
              >
                <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={userName}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                      {getInitial(userName)}
                    </div>
                  )}
                </div>

                <div className="hidden text-left sm:block">
                  <p className="max-w-[130px] truncate text-sm font-bold text-white">
                    {userName}
                  </p>
                  <p className="-mt-0.5 text-xs capitalize text-slate-400">
                    {user?.role}
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  className={`text-slate-300 transition ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
                  <div className="border-b border-white/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt={userName}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-base font-black text-white">
                            {getInitial(userName)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {userName}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {user?.email}
                        </p>

                        {user?.role && (
                          <span className="mt-2 inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-xs font-bold capitalize text-blue-300">
                            {user.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      to="/my-account"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      <UserCircle size={18} />
                      My Account
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
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
