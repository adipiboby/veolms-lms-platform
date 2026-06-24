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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-[280px] flex-col border-r border-white/10 bg-slate-950 p-5">
          <Link to="/admin/dashboard" className="mb-8 block">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center">
                <GraduationCap size={26} />
              </div>

              <div>
                <h1 className="text-xl font-black">VeoLMS</h1>
                <p className="text-xs text-slate-400">Admin Panel</p>
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
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={20} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Home size={20} />
              Public Home
            </Link>

            <Link
              to="/courses"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <BookOpen size={20} />
              Public Courses
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="mt-auto flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={20} />
            Logout
          </button>
        </aside>

        <section className="flex-1 min-w-0">
          <div className="lg:hidden sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-white/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <Link to="/admin/dashboard" className="font-black text-xl">
                VeoLMS Admin
              </Link>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-300 font-bold"
              >
                Logout
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                    isActive ? "bg-blue-600 text-white" : "bg-white/10"
                  }`
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/admin/courses"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                    isActive ? "bg-blue-600 text-white" : "bg-white/10"
                  }`
                }
              >
                Courses
              </NavLink>

              <NavLink
                to="/admin/students"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                    isActive ? "bg-blue-600 text-white" : "bg-white/10"
                  }`
                }
              >
                Students
              </NavLink>

              <Link
                to="/"
                className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap bg-white/10"
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
