import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const GoogleLoginButton = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError("");

      const credential = credentialResponse?.credential;

      if (!credential) {
        setError("Google credential not received");
        return;
      }

      const data = await loginWithGoogle(credential);

      const loggedInUser = data.user;

      if (!loggedInUser) {
        setError("Google login failed. User session not found.");
        return;
      }

      if (loggedInUser.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/student/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Google login failed:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Google login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google login was cancelled or failed")}
          theme="outline"
          size="large"
          shape="pill"
          text="signin_with"
          width="320"
        />
      </div>

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} />
          Signing in with Google...
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-red-300">{error}</p>
      )}
    </div>
  );
};

export default GoogleLoginButton;