import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Rss,
  UserCircle,
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

const MobileBottomNavItem = ({ to, label, icon: Icon, badge }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-bold transition ${
          isActive
            ? "bg-blue-600/20 text-blue-600 ring-1 ring-blue-500/40 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-400/30"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        }`
      }
    >
      <span className="relative">
        <Icon size={22} strokeWidth={2.2} />
        {badge ? (
          <span className="absolute -right-3 -top-2">{badge}</span>
        ) : null}
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
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

  const handleProfileButtonClick = () => {
    setProfileMenuOpen((value) => !value);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full max-w-full overflow-x-hidden border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
        <nav className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 px-3 py-3 sm:px-4 lg:px-6">
          <Link
            to="/"
            className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:max-w-[42%] lg:max-w-none"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <GraduationCap size={22} className="text-white" />
            </div>

            <div className="min-w-0">
              {isLearningPage ? (
                <>
                  <h1 className="max-w-[42vw] truncate text-base font-black tracking-tight text-slate-950 sm:max-w-[320px] sm:text-lg lg:max-w-[520px] dark:text-white">
                    {learningCourseTitle || "Learning"}
                  </h1>

                  <p className="-mt-1 hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                    VeoLMS Learning Mode
                  </p>
                </>
              ) : (
                <>
                  <h1 className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl dark:text-white">
                    VeoLMS
                  </h1>

                  <p className="-mt-1 hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                    Learning Platform
                  </p>
                </>
              )}
            </div>
          </Link>

          <div className="hidden shrink-0 items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 md:flex lg:gap-2 dark:border-white/10 dark:bg-white/5">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${linkClass({ isActive })} rounded-xl px-3 py-2 text-sm font-medium lg:px-4`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/courses"
              className={({ isActive }) =>
                `${linkClass({ isActive })} rounded-xl px-3 py-2 text-sm font-medium lg:px-4`
              }
            >
              Courses
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/feed"
                className={({ isActive }) =>
                  `${linkClass({ isActive })} rounded-xl px-3 py-2 text-sm font-medium lg:px-4`
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
                  `${linkClass({ isActive })} rounded-xl px-3 py-2 text-sm font-medium lg:px-4`
                }
              >
                Dashboard
              </NavLink>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden md:block">
              <ThemeToggle compact />
            </div>

            {isAuthenticated ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={handleProfileButtonClick}
                  className="flex max-w-[3.5rem] shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-100 py-1 pl-1 pr-2 text-slate-950 transition hover:bg-slate-200 sm:max-w-[220px] sm:pr-3 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
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

                  <div className="hidden min-w-0 text-left sm:block">
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
                  <div className="fixed right-4 top-[4.75rem] z-[80] w-[min(calc(100vw-2rem),28rem)] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-2xl shadow-black/20 md:absolute md:right-0 md:top-14 md:z-50 md:w-72 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40">
                    <div className="border-b border-slate-200 p-5 dark:border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 md:h-12 md:w-12">
                          {profileImage ? (
                            <img
                              src={profileImage}
                              alt={userName}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl font-black text-white md:text-base">
                              {getInitial(userName)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-slate-950 md:text-sm dark:text-white">
                            {userName}
                          </p>

                          <p className="mt-1 truncate text-sm text-slate-500 md:text-xs dark:text-slate-400">
                            {user?.email}
                          </p>

                          {user?.role && (
                            <span className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                              {user.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 p-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                        <ThemeToggle />
                      </div>

                      <Link
                        to="/my-account"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-100 hover:text-slate-950 dark:text-white dark:hover:bg-white/10"
                      >
                        <UserCircle size={20} />
                        My Account
                      </Link>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
                      >
                        <LogOut size={20} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-3 sm:flex">
                <Link
                  to="/login"
                  className="px-4 py-2 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
                >
                  Join Free
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {!isLearningPage && (
        <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[1.45rem] border border-slate-200 bg-white/90 p-1.5 shadow-2xl shadow-black/15 backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/40">
          <div
            className={`grid gap-1 ${
              isAuthenticated ? "grid-cols-5" : "grid-cols-2"
            }`}
          >
            <MobileBottomNavItem to="/" label="Home" icon={Home} />
            <MobileBottomNavItem
              to="/courses"
              label="Courses"
              icon={BookOpen}
            />

            {isAuthenticated && (
              <>
                <MobileBottomNavItem
                  to="/feed"
                  label="Feed"
                  icon={Rss}
                  badge={
                    !isFeedPage ? <FeedBadge count={feedUnreadCount} /> : null
                  }
                />

                <MobileBottomNavItem
                  to={dashboardPath}
                  label="Dashboard"
                  icon={LayoutDashboard}
                />

                <MobileBottomNavItem
                  to="/my-account"
                  label="Account"
                  icon={UserCircle}
                />
              </>
            )}
          </div>
        </nav>
      )}
    </>
  );
};

export default Navbar;
