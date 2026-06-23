import { useAuth } from "../context/AuthContext";

const AdminDashboardPage = () => {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <section className="max-w-7xl mx-auto">
        <p className="text-purple-400 font-semibold mb-3">Admin Dashboard</p>

        <h1 className="text-4xl font-bold mb-4">
          Welcome Admin, {user?.name}
        </h1>

        <p className="text-slate-400 mb-8">
          Course management, students, enrollments, and payments will be managed
          here.
        </p>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold">3</h2>
            <p className="text-slate-400">Courses</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold">0</h2>
            <p className="text-slate-400">Students</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold">0</h2>
            <p className="text-slate-400">Enrollments</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold">₹0</h2>
            <p className="text-slate-400">Test Revenue</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminDashboardPage;