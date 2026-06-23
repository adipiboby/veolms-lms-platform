import { useAuth } from "../context/AuthContext";

const StudentDashboardPage = () => {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <section className="max-w-7xl mx-auto">
        <p className="text-blue-400 font-semibold mb-3">Student Dashboard</p>

        <h1 className="text-4xl font-bold mb-4">
          Welcome back, {user?.name}
        </h1>

        <p className="text-slate-400 mb-8">
          Your enrolled courses, continue learning, and progress tracking will
          be shown here.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold">0</h2>
            <p className="text-slate-400">My Courses</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold">0%</h2>
            <p className="text-slate-400">Average Progress</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold">0</h2>
            <p className="text-slate-400">Completed Lessons</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default StudentDashboardPage;