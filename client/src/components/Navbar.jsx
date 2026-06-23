import { Link, NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GraduationCap size={22} className="text-white" />
          </div>

          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              VeoLMS
            </h1>
            <p className="text-xs text-slate-400 -mt-1">Learning Platform</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-1">
          <NavLink to="/" className={`${linkClass} px-4 py-2 rounded-xl text-sm font-medium`}>
            Home
          </NavLink>

          <NavLink to="/courses" className={`${linkClass} px-4 py-2 rounded-xl text-sm font-medium`}>
            Courses
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to={dashboardPath}
              className={`${linkClass} px-4 py-2 rounded-xl text-sm font-medium`}
            >
              Dashboard
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-red-500/20 hover:text-red-200 border border-white/10"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex px-4 py-2 text-slate-300 hover:text-white"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
              >
                Join Free
              </Link>
            </>
          )}

          <button className="md:hidden p-2 rounded-xl bg-white/10 border border-white/10 text-white">
            <Menu size={22} />
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;