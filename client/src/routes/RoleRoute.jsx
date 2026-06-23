import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleRoute = ({ allowedRoles, children }) => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Checking permission...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;