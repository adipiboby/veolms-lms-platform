import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactPlayer from "react-player";
import { api } from "../../src/services/api";
import { CheckCircle, Clock, Lock, PlayCircle } from "lucide-react";

const CourseDetailsPage = () => {
  const { slug } = useParams();

  const [course, setCourse] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${slug}`);
        const courseData = res.data.course;

        setCourse(courseData);
        setSelectedVideo(courseData.trailerVideoUrl);
      } catch (error) {
        console.error("Failed to fetch course", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug]);

  if (loading) {
    return <p className="max-w-7xl mx-auto px-4 py-12">Loading course...</p>;
  }

  if (!course) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold">Course not found</h1>
      </main>
    );
  }

  const lessonsCount =
    course.sections?.reduce(
      (total, section) => total + section.lessons.length,
      0,
    ) || 0;

  return (
    <main>
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-blue-400 font-semibold mb-3">
              {course.category} • {course.level}
            </p>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-5">
              {course.title}
            </h1>

            <p className="text-slate-300 text-lg mb-6">{course.description}</p>

            <p className="text-slate-300 mb-6">
              Created by{" "}
              <span className="text-white font-semibold">
                {course.instructorName}
              </span>
            </p>

            <div className="flex flex-wrap gap-4 mb-8 text-slate-300">
              <span className="flex items-center gap-2">
                <Clock size={18} />
                {lessonsCount} lessons
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle size={18} />
                Lifetime access
              </span>
            </div>

            <div className="flex items-center gap-5">
              <button className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
                Buy Now ₹{course.price}
              </button>

              <button
                onClick={() => setSelectedVideo(course.trailerVideoUrl)}
                className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold"
              >
                Watch Trailer
              </button>
            </div>
          </div>

          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
            <div className="aspect-video">
              <ReactPlayer
                src={selectedVideo}
                controls
                width="100%"
                height="100%"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">What you will learn</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <p className="flex items-start gap-2 text-slate-700">
                <CheckCircle className="text-green-600 mt-1" size={18} />
                Build real-world web development skills.
              </p>

              <p className="flex items-start gap-2 text-slate-700">
                <CheckCircle className="text-green-600 mt-1" size={18} />
                Understand concepts with practical examples.
              </p>

              <p className="flex items-start gap-2 text-slate-700">
                <CheckCircle className="text-green-600 mt-1" size={18} />
                Learn through structured lessons.
              </p>

              <p className="flex items-start gap-2 text-slate-700">
                <CheckCircle className="text-green-600 mt-1" size={18} />
                Track progress after enrollment.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-2xl font-bold mb-6">Course Curriculum</h2>

            <div className="space-y-5">
              {course.sections.map((section) => (
                <div
                  key={section._id}
                  className="border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div className="bg-slate-50 px-5 py-4 font-bold">
                    {section.title}
                  </div>

                  <div>
                    {section.lessons.map((lesson) => (
                      <div
                        key={lesson._id}
                        className="px-5 py-4 border-t border-slate-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {lesson.isPreview ? (
                            <PlayCircle className="text-blue-600" size={20} />
                          ) : (
                            <Lock className="text-slate-400" size={20} />
                          )}

                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {lesson.title}
                            </h3>

                            <p className="text-sm text-slate-500">
                              {lesson.duration}
                            </p>
                          </div>
                        </div>

                        {lesson.isPreview ? (
                          <button
                            onClick={() => setSelectedVideo(lesson.videoUrl)}
                            className="text-blue-600 font-semibold"
                          >
                            Preview
                          </button>
                        ) : (
                          <span className="text-sm text-slate-500">
                            Enroll to watch
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-slate-200 p-6 h-fit sticky top-24">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="rounded-xl mb-5"
          />

          <h3 className="text-3xl font-bold mb-4">₹{course.price}</h3>

          <button className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mb-4">
            Buy Course
          </button>

          <button className="w-full px-6 py-4 border border-slate-300 rounded-xl font-bold">
            Add to Wishlist
          </button>

          <div className="mt-6 space-y-3 text-slate-600 text-sm">
            <p>✅ {lessonsCount} lessons</p>
            <p>✅ Preview lessons available</p>
            <p>✅ Progress tracking after enrollment</p>
            <p>✅ Lifetime access</p>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default CourseDetailsPage;
