import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  UserCircle,
  X,
} from "lucide-react";

import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./common/ThemeToggle";

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

const FeedBadge = ({ count }) => {
  if (!count || count <= 0) return null;

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-black leading-none text-white shadow-lg shadow-red-500/20">
      {count > 99 ? "99+" : count}
    </span>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const profileMenuRef = useRef(null);

  const { user, logout, isAuthenticated } = useAuth();

  const isLearningPage = location.pathname.startsWith("/learn/");
  const isFeedPage = location.pathname.startsWith("/feed");

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);

  const [learningCourseTitle, setLearningCourseTitle] = useState(() => {
    return localStorage.getItem(LEARNING_COURSE_TITLE_KEY) || "";
  });

  const profileImage = getProfileImage(user);
  const userName = getUserName(user);

  const dashboardPath =
    user?.role === "admin" ? "/admin/dashboard" : "/student/dashboard";

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
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

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
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setFeedUnreadCount(0);
      return;
    }

    let active = true;

    const fetchFeedUnreadCount = async () => {
      try {
        if (window.location.pathname.startsWith("/feed")) {
          if (active) setFeedUnreadCount(0);
          return;
        }

        const { data } = await api.get("/feed/unread-count");

        if (active) {
          setFeedUnreadCount(Number(data?.unreadCount || 0));
        }
      } catch (error) {
        console.error("FEED_UNREAD_COUNT_ERROR:", error);
      }
    };

    fetchFeedUnreadCount();

    const intervalId = window.setInterval(fetchFeedUnreadCount, 60000);

    const handleFeedReadUpdated = () => {
      setFeedUnreadCount(0);
    };

    window.addEventListener("feed-read-updated", handleFeedReadUpdated);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("feed-read-updated", handleFeedReadUpdated);
    };
  }, [isAuthenticated, location.pathname]);

  const linkClass = ({ isActive }) => {
    return isActive
      ? "border border-blue-200 bg-blue-50 text-blue-700 dark:border-white/10 dark:bg-white/10 dark:text-white"
      : "border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white";
  };

  const mobileLinkClass = ({ isActive }) => {
    return isActive
      ? "border border-blue-200 bg-blue-50 text-blue-700 dark:border-white/10 dark:bg-white/10 dark:text-white"
      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white";
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
            <GraduationCap size={22} className="text-white" />
          </div>

          <div className="min-w-0">
            {isLearningPage ? (
              <>
                <h1 className="max-w-[520px] truncate text-lg font-black tracking-tight text-slate-950 dark:text-white">
                  {learningCourseTitle || "Learning"}
                </h1>

                <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">
                  VeoLMS Learning Mode
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                  VeoLMS
                </h1>

                <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Learning Platform
                </p>
              </>
            )}
          </div>
        </Link>

        <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 md:flex dark:border-white/10 dark:bg-white/5">
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
              to="/feed"
              className={({ isActive }) =>
                `${linkClass({ isActive })} rounded-xl px-4 py-2 text-sm font-medium`
              }
            >
              <span className="inline-flex items-center gap-2">
                Feed
                {!isFeedPage && <FeedBadge count={feedUnreadCount} />}
              </span>
            </NavLink>
          )}

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
          <div className="hidden sm:block">
            <ThemeToggle compact />
          </div>

          {isAuthenticated ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 py-1 pl-1 pr-3 text-slate-950 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
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
                  <p className="max-w-[130px] truncate text-sm font-bold text-slate-950 dark:text-white">
                    {userName}
                  </p>

                  <p className="-mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">
                    {user?.role}
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition dark:text-slate-300 ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40">
                  <div className="border-b border-slate-200 p-4 dark:border-white/10">
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
                        <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                          {userName}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {user?.email}
                        </p>

                        {user?.role && (
                          <span className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold capitalize text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                            {user.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <div className="mb-2 sm:hidden">
                      <ThemeToggle />
                    </div>

                    <Link
                      to="/my-account"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <UserCircle size={18} />
                      My Account
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
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
                className="hidden px-4 py-2 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white sm:inline-flex"
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

          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-800 md:hidden dark:border-white/10 dark:bg-white/10 dark:text-white"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-xl md:hidden dark:border-white/10 dark:bg-slate-950">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${mobileLinkClass({ isActive })} rounded-2xl px-4 py-3 text-sm font-black`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/courses"
              className={({ isActive }) =>
                `${mobileLinkClass({ isActive })} rounded-2xl px-4 py-3 text-sm font-black`
              }
            >
              Courses
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/feed"
                className={({ isActive }) =>
                  `${mobileLinkClass({ isActive })} rounded-2xl px-4 py-3 text-sm font-black`
                }
              >
                <span className="inline-flex w-full items-center justify-between gap-3">
                  <span>Feed</span>
                  {!isFeedPage && <FeedBadge count={feedUnreadCount} />}
                </span>
              </NavLink>
            )}

            {isAuthenticated && (
              <NavLink
                to={dashboardPath}
                className={({ isActive }) =>
                  `${mobileLinkClass({ isActive })} rounded-2xl px-4 py-3 text-sm font-black`
                }
              >
                Dashboard
              </NavLink>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <ThemeToggle />
            </div>

            {!isAuthenticated && (
              <div className="grid gap-2 pt-2">
                <Link
                  to="/login"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-center text-sm font-black text-white"
                >
                  Join Free
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-black text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
