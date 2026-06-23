import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, CheckCircle, PlayCircle } from "lucide-react";
import { api } from "../services/api";

const getYouTubeEmbedUrl = (url) => {
  if (!url) return "";

  if (url.includes("youtube.com/embed/")) {
    return url;
  }

  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
};

const LearningPage = () => {
  const { slug } = useParams();

  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const lessons = useMemo(() => {
    if (!course?.sections) return [];

    return course.sections.flatMap((section) =>
      section.lessons.map((lesson) => ({
        ...lesson,
        sectionTitle: section.title,
      }))
    );
  }, [course]);

  useEffect(() => {
    const fetchLearningCourse = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/enrollments/learn/${slug}`);

        setCourse(res.data.course);

        const firstLesson = res.data.course.sections
          ?.flatMap((section) =>
            section.lessons.map((lesson) => ({
              ...lesson,
              sectionTitle: section.title,
            }))
          )
          ?.sort((a, b) => a.order - b.order)[0];

        setCurrentLesson(firstLesson || null);
      } catch (error) {
        console.error(error);
        setError(
          error.response?.data?.message || "Failed to load course lessons"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLearningCourse();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white pt-28 px-4">
        <p className="text-slate-400">Loading learning page...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white pt-28 px-4">
        <div className="max-w-3xl mx-auto rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-3xl font-black text-red-300 mb-3">
            Access Denied
          </h1>
          <p className="text-slate-300 mb-6">{error}</p>

          <Link
            to="/courses"
            className="inline-flex px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold"
          >
            Browse Courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white pt-24">
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <Link
            to="/student/dashboard"
            className="text-blue-400 font-semibold hover:text-blue-300"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="text-3xl md:text-4xl font-black mt-4">
            {course?.title}
          </h1>

          <p className="text-slate-400 mt-2">
            Enrolled course learning area
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="aspect-video bg-black">
              {currentLesson?.videoUrl ? (
                <iframe
                  src={getYouTubeEmbedUrl(currentLesson.videoUrl)}
                  title={currentLesson.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No video selected
                </div>
              )}
            </div>

            <div className="p-6">
              <p className="text-blue-400 font-bold mb-2">
                {currentLesson?.sectionTitle}
              </p>

              <h2 className="text-2xl md:text-3xl font-black mb-3">
                {currentLesson?.title}
              </h2>

              <p className="text-slate-400">
                Watch this lesson and continue through the course curriculum.
                Progress tracking will be connected next.
              </p>
            </div>
          </div>

          <aside className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-300 flex items-center justify-center">
                  <BookOpen size={22} />
                </div>

                <div>
                  <h3 className="text-xl font-black">Course Lessons</h3>
                  <p className="text-sm text-slate-400">
                    {lessons.length} lessons
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[650px] overflow-y-auto">
              {course?.sections?.map((section) => (
                <div key={section._id} className="border-b border-white/10">
                  <div className="px-5 py-4 bg-slate-950/60">
                    <h4 className="font-black">{section.title}</h4>
                  </div>

                  <div className="p-3 space-y-2">
                    {section.lessons.map((lesson) => {
                      const isActive = currentLesson?._id === lesson._id;

                      return (
                        <button
                          key={lesson._id}
                          onClick={() =>
                            setCurrentLesson({
                              ...lesson,
                              sectionTitle: section.title,
                            })
                          }
                          className={`w-full text-left p-4 rounded-2xl border ${
                            isActive
                              ? "bg-blue-600/20 border-blue-500/50"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 ${
                                isActive ? "text-blue-300" : "text-slate-400"
                              }`}
                            >
                              {isActive ? (
                                <PlayCircle size={18} />
                              ) : (
                                <CheckCircle size={18} />
                              )}
                            </div>

                            <div>
                              <p className="font-bold text-white">
                                {lesson.title}
                              </p>
                              <p className="text-sm text-slate-400 mt-1">
                                {lesson.duration}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default LearningPage;