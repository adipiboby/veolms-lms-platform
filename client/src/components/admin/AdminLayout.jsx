import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  GraduationCap,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navClass = ({ isActive }) =>
    isActive
      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
      : "text-slate-400 hover:bg-white/5 hover:text-white";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 border-r border-white/10 bg-slate-950/95 backdrop-blur-xl flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <GraduationCap size={24} />
              </div>

              <div>
                <h1 className="text-xl font-black">VeoLMS</h1>
                <p className="text-xs text-slate-400">Admin Panel</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <NavLink
              to="/admin/dashboard"
              className={`${navClass} flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold`}
            >
              <BarChart3 size={20} />
              Overview
            </NavLink>

            <NavLink
              to="/admin/courses"
              className={`${navClass} flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold`}
            >
              <BookOpen size={20} />
              Courses
            </NavLink>

            <NavLink
              to="/admin/students"
              className={`${navClass} flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold`}
            >
              <Users size={20} />
              Students
            </NavLink>

            <NavLink
              to="/admin/payments"
              className={`${navClass} flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold`}
            >
              <CreditCard size={20} />
              Payments
            </NavLink>

            <NavLink
              to="/admin/settings"
              className={`${navClass} flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold`}
            >
              <Settings size={20} />
              Settings
            </NavLink>
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4">
              <p className="font-bold">{user?.name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 text-red-300 hover:bg-red-500/20 font-bold"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        <section className="w-full lg:pl-72">
          <div className="min-h-screen">{children}</div>
        </section>
      </div>
    </main>
  );
};

export default AdminLayout;