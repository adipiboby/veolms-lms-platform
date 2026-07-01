import { Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import AdminLayout from "./components/admin/AdminLayout";

import HomePage from "./pages/HomePage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailsPage from "./pages/CourseDetailsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import LearningPage from "./pages/LearningPage";
import CertificatePage from "./pages/CertificatePage";

import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminCoursesPage from "./pages/AdminCoursesPage";
import AdminCourseCreatePage from "./pages/AdminCourseCreatePage";
import AdminCourseEditPage from "./pages/AdminCourseEditPage";
import AdminStudentsPage from "./pages/AdminStudentsPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

import MyAccountPage from "./pages/MyAccountPage";
import FeedPage from "./pages/FeedPage.jsx";
const App = () => {
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />

        <Route path="/courses" element={<CoursesPage />} />

        <Route path="/courses/:slug" element={<CourseDetailsPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/certificates/:certificateId"
          element={<CertificatePage />}
        />

        {/* Student + Admin learning access */}
        <Route
          path="/learn/:slug"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["student", "admin"]}>
                <LearningPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Student routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["student"]}>
                <StudentDashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Admin dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Admin courses */}
        <Route
          path="/admin/courses"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminCoursesPage />
                </AdminLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Admin create course */}
        <Route
          path="/admin/courses/create"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminCourseCreatePage />
                </AdminLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Admin edit course */}
        <Route
          path="/admin/courses/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminCourseEditPage />
                </AdminLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Admin students */}
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminStudentsPage />
                </AdminLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Account */}
        <Route
          path="/my-account"
          element={
            <ProtectedRoute>
              <MyAccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
