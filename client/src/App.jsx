import { Route, Routes } from "react-router-dom";
import Navbar from "../src/components/Navbar";
import HomePage from "../src/pages/HomePage";
import CoursesPage from "../src/pages/CoursesPage";
import CourseDetailsPage from "../src/pages/CourseDetailsPage";
import LoginPage from "../src/pages/LoginPages";
import RegisterPage from "../src/pages/RegisterPage";

const App = () => {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:slug" element={<CourseDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </>
  );
};

export default App;
