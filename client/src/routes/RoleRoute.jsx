import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-blue-400" size={24} />
          Checking permissions...
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
};

export default RoleRoute;