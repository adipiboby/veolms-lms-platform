import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-blue-400" size={24} />
          Checking authentication...
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;