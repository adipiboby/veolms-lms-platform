import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../common/ThemeToggle";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Courses",
      path: "/admin/courses",
      icon: BookOpen,
    },
    {
      label: "Students",
      path: "/admin/students",
      icon: Users,
    },
  ];

  const desktopNavClass = ({ isActive }) => {
    return `flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${
      isActive
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
    }`;
  };

  const mobileNavClass = ({ isActive }) => {
    return `whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
    }`;
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-[280px] flex-col border-r border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 lg:flex dark:border-white/10 dark:bg-slate-950 dark:shadow-black/20">
          <Link to="/admin/dashboard" className="mb-8 block">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <GraduationCap size={26} />
              </div>

              <div>
                <h1 className="text-xl font-black text-slate-950 dark:text-white">
                  VeoLMS
                </h1>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Admin Panel
                </p>
              </div>
            </div>
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={desktopNavClass}
                >
                  <Icon size={20} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 space-y-2 border-t border-slate-200 pt-6 dark:border-white/10">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Home size={20} />
              Public Home
            </Link>

            <Link
              to="/courses"
              className="flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <BookOpen size={20} />
              Public Courses
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <ThemeToggle />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <LogOut size={20} />
            Logout
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur lg:hidden dark:border-white/10 dark:bg-slate-950/95">
            <div className="flex items-center justify-between gap-4">
              <Link
                to="/admin/dashboard"
                className="text-xl font-black text-slate-950 dark:text-white"
              >
                VeoLMS Admin
              </Link>

              <div className="flex items-center gap-2">
                <ThemeToggle compact />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl bg-red-50 px-4 py-2 font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <NavLink to="/admin/dashboard" className={mobileNavClass}>
                Dashboard
              </NavLink>

              <NavLink to="/admin/courses" className={mobileNavClass}>
                Courses
              </NavLink>

              <NavLink to="/admin/students" className={mobileNavClass}>
                Students
              </NavLink>

              <Link
                to="/"
                className="whitespace-nowrap rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
              >
                Home
              </Link>
            </div>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
};

export default AdminLayout;
