import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Checking authentication...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;