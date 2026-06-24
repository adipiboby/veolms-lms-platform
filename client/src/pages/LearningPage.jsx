import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, CheckCircle, PlayCircle } from "lucide-react";
import { api } from "../services/api";
import VideoPlayer from "../components/video/VideoPlayer";

const LearningPage = () => {
  const { slug } = useParams();

  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [progress, setProgress] = useState({
    totalLessons: 0,
    completedLessons: 0,
    progressPercentage: 0,
    lessonProgress: [],
    currentLessonId: null,
  });

  const [markingComplete, setMarkingComplete] = useState(false);

  const [videoSource, setVideoSource] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");

  const completedLessonIds = new Set(
    progress.lessonProgress
      ?.filter((item) => item.isCompleted)
      .map((item) => item.lessonId),
  );

  const lessons = useMemo(() => {
    if (!course?.sections) return [];

    return course.sections.flatMap((section) =>
      section.lessons.map((lesson) => ({
        ...lesson,
        sectionTitle: section.title,
      })),
    );
  }, [course]);

  const loadSecureVideo = async (lesson) => {
    if (!course?._id || !lesson?._id) return;

    try {
      setVideoLoading(true);
      setVideoError("");
      setVideoSource("");

      const res = await api.post("/videos/signed-url", {
        courseId: course._id,
        lessonId: lesson._id,
      });

      setVideoSource(res.data.videoUrl);
    } catch (error) {
      console.error("Failed to load secure video", error);

      setVideoError(
        error.response?.data?.message || "Failed to load secure video",
      );

      setVideoSource("");
    } finally {
      setVideoLoading(false);
    }
  };

  useEffect(() => {
    const fetchLearningCourse = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/enrollments/learn/${slug}`);

        const loadedCourse = res.data.course;
        setCourse(loadedCourse);

        const progressRes = await api.get(
          `/progress/course/${loadedCourse._id}`,
        );

        setProgress(progressRes.data);

        const allLessons =
          loadedCourse.sections
            ?.flatMap((section) =>
              section.lessons.map((lesson) => ({
                ...lesson,
                sectionTitle: section.title,
              })),
            )
            ?.sort((a, b) => a.order - b.order) || [];

        const resumeLesson =
          allLessons.find(
            (lesson) => lesson._id === progressRes.data.currentLessonId,
          ) || allLessons[0];

        setCurrentLesson(resumeLesson || null);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.message || "Failed to load course lessons",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLearningCourse();
  }, [slug]);

  useEffect(() => {
    if (course && currentLesson) {
      loadSecureVideo(currentLesson);
    }
  }, [course?._id, currentLesson?._id]);

  const handleLessonClick = async (lesson, sectionTitle) => {
    try {
      setCurrentLesson({
        ...lesson,
        sectionTitle,
      });

      await api.post("/progress/lesson", {
        courseId: course._id,
        lessonId: lesson._id,
        isCompleted: completedLessonIds.has(lesson._id),
      });

      const progressRes = await api.get(`/progress/course/${course._id}`);
      setProgress(progressRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkLessonComplete = async () => {
    if (!course?._id || !currentLesson?._id) return;

    try {
      setMarkingComplete(true);

      await api.post("/progress/lesson", {
        courseId: course._id,
        lessonId: currentLesson._id,
        isCompleted: true,
      });

      const progressRes = await api.get(`/progress/course/${course._id}`);
      setProgress(progressRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setMarkingComplete(false);
    }
  };

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

          <p className="text-slate-400 mt-2">Enrolled course learning area</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
            {videoLoading ? (
              <div className="aspect-video bg-black flex items-center justify-center text-slate-400">
                Preparing secure video...
              </div>
            ) : videoError ? (
              <div className="aspect-video bg-black flex items-center justify-center text-red-300">
                {videoError}
              </div>
            ) : videoSource ? (
              <VideoPlayer
                key={currentLesson?._id}
                src={videoSource}
                title={currentLesson?.title}
              />
            ) : (
              <div className="aspect-video bg-black flex items-center justify-center text-slate-400">
                No video selected
              </div>
            )}

            <div className="p-6">
              <p className="text-blue-400 font-bold mb-2">
                {currentLesson?.sectionTitle}
              </p>

              <h2 className="text-2xl md:text-3xl font-black mb-3">
                {currentLesson?.title}
              </h2>

              <p className="text-slate-400">
                Watch this lesson and continue through the course curriculum.
              </p>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">Course Progress</p>

                  <p className="text-sm font-bold text-blue-300">
                    {progress.progressPercentage}%
                  </p>
                </div>

                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                    style={{ width: `${progress.progressPercentage}%` }}
                  />
                </div>

                <p className="text-sm text-slate-400 mt-2">
                  {progress.completedLessons} of {progress.totalLessons} lessons
                  completed
                </p>
              </div>

              <button
                onClick={handleMarkLessonComplete}
                disabled={
                  markingComplete || completedLessonIds.has(currentLesson?._id)
                }
                className="mt-6 px-6 py-3 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-60"
              >
                {completedLessonIds.has(currentLesson?._id)
                  ? "Completed"
                  : markingComplete
                    ? "Saving..."
                    : "Mark as Complete"}
              </button>
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
                      const isCompleted = completedLessonIds.has(lesson._id);

                      return (
                        <button
                          key={lesson._id}
                          onClick={() =>
                            handleLessonClick(lesson, section.title)
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
                                isCompleted
                                  ? "text-green-300"
                                  : isActive
                                    ? "text-blue-300"
                                    : "text-slate-400"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle size={18} />
                              ) : (
                                <PlayCircle size={18} />
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
