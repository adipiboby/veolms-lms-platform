import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import GoogleLoginButton from "../components/auth/GoogleLoginButton";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;

    if (!name) {
      return "Name is required";
    }

    if (name.length < 2) {
      return "Name must be at least 2 characters";
    }

    if (!email) {
      return "Email is required";
    }

    if (!email.includes("@")) {
      return "Enter a valid email address";
    }

    if (!password) {
      return "Password is required";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const user = data.user;

      if (user?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/student/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Register failed:", error);

      setError(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white pt-24 px-4">
      <section className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center py-10">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-6">
            <GraduationCap size={20} />
            <span className="font-bold">Join VeoLMS</span>
          </div>

          <h1 className="text-5xl font-black leading-tight">
            Start learning with a modern LMS platform.
          </h1>

          <p className="text-slate-400 text-lg mt-5 leading-8">
            Create your student account, enroll in courses, watch secure
            lessons, track your progress, and generate certificates after
            completion.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-2xl font-black text-blue-300">Secure</h3>
              <p className="text-slate-400 mt-2 text-sm">
                Protected student learning experience.
              </p>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-2xl font-black text-green-300">
                Certificates
              </h3>
              <p className="text-slate-400 mt-2 text-sm">
                Earn certificates after course completion.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="rounded-[2rem] bg-white/5 border border-white/10 shadow-2xl p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
                <GraduationCap size={30} />
              </div>

              <h1 className="text-3xl font-black">Create Account</h1>

              <p className="text-slate-400 mt-2">
                Register as a student and start learning.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  autoComplete="name"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create password"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Minimum 6 characters required.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-sm text-slate-400">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <GoogleLoginButton />

            <p className="text-center text-slate-400 mt-7">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 font-bold"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default RegisterPage;