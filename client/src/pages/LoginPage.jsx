import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleLoginButton from "../components/auth/GoogleLoginButton";
const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      const data = await login(formData);

      if (data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/student/dashboard");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>

        <p className="text-slate-400 mb-8">
          Login to continue your learning journey.
        </p>

        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-sm text-slate-400">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <GoogleLoginButton />
        </form>

        <p className="text-slate-400 text-sm mt-6 text-center">
          New to VeoLMS?{" "}
          <Link to="/register" className="text-blue-400 font-semibold">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
