import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Volume2,
} from "lucide-react";

const isYouTubeUrl = (url = "") => {
  return url.includes("youtube.com") || url.includes("youtu.be");
};

const getYouTubeEmbedUrl = (url) => {
  if (!url) return "";

  if (url.includes("youtube.com/embed/")) return url;

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

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return "0:00";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const VideoPlayer = ({ src, title }) => {
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const controlsTimerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  const [hoverTime, setHoverTime] = useState(0);
  const [hoverLeft, setHoverLeft] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playRequested, setPlayRequested] = useState(false);

  const isYouTube = isYouTubeUrl(src);

  const showControlsTemporarily = () => {
    setControlsVisible(true);

    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      showControlsTemporarily();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      showControlsTemporarily();
    }
  }, [isPlaying]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setShowPreview(false);
    setControlsVisible(true);
    setIsVideoReady(false);
    setIsBuffering(true);
    setPlayRequested(false);
  }, [src]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleFullscreenMouseMove = () => {
      showControlsTemporarily();
    };

    document.addEventListener("mousemove", handleFullscreenMouseMove);
    document.addEventListener("pointermove", handleFullscreenMouseMove);
    document.addEventListener("touchstart", handleFullscreenMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleFullscreenMouseMove);
      document.removeEventListener("pointermove", handleFullscreenMouseMove);
      document.removeEventListener("touchstart", handleFullscreenMouseMove);
    };
  }, [isFullscreen, isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  const safelyPlayVideo = async () => {
    const video = videoRef.current;
    if (!video) return false;

    try {
      await video.play();
      setIsPlaying(true);
      return true;
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Video play failed:", error);
      }

      setIsPlaying(false);
      return false;
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isVideoReady) {
      setPlayRequested(true);
      setIsBuffering(true);
      showControlsTemporarily();
      return;
    }

    if (video.paused) {
      await safelyPlayVideo();
    } else {
      video.pause();
      setIsPlaying(false);
    }

    showControlsTemporarily();
  };

  const stopVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;

    setCurrentTime(0);
    setIsPlaying(false);
    setPlayRequested(false);
    showControlsTemporarily();
  };

  const seekVideo = (seconds) => {
    const video = videoRef.current;
    if (!video) return;

    const safeDuration = video.duration || duration || 0;
    const nextTime = Math.max(
      0,
      Math.min(video.currentTime + seconds, safeDuration),
    );

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    showControlsTemporarily();
  };

  const handleProgressChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Number(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    showControlsTemporarily();
  };

  const handleProgressHover = (e) => {
    if (!progressRef.current || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(x / rect.width, 1));
    const time = percent * duration;

    setHoverTime(time);
    setHoverLeft(percent * 100);
    setShowPreview(true);

    const previewVideo = previewVideoRef.current;

    if (previewVideo && previewVideo.readyState >= 1) {
      try {
        previewVideo.currentTime = time;
      } catch {
        // ignore preview seek errors
      }
    }
  };

  const handleSpeedChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newSpeed = Number(e.target.value);
    video.playbackRate = newSpeed;
    setSpeed(newSpeed);
    showControlsTemporarily();
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = Number(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    showControlsTemporarily();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }

      showControlsTemporarily();
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  };

  if (isYouTube) {
    return (
      <div className="rounded-3xl bg-black border border-white/10 overflow-hidden">
        <div className="aspect-video bg-black">
          <iframe
            src={getYouTubeEmbedUrl(src)}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="p-4 bg-slate-950 border-t border-white/10">
          <p className="text-sm text-slate-400">
            YouTube preview mode. Full custom controls work with S3 MP4 videos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={showControlsTemporarily}
      onMouseMove={showControlsTemporarily}
      onPointerEnter={showControlsTemporarily}
      onPointerMove={showControlsTemporarily}
      onMouseLeave={() => {
        if (!isFullscreen) {
          setControlsVisible(false);
        }
      }}
      className={`relative bg-black border border-white/10 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : "rounded-3xl"
      }`}
    >
      <div className={`${isFullscreen ? "h-screen" : "aspect-video"} bg-black`}>
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain bg-black"
          preload="metadata"
          onClick={togglePlay}
          onLoadStart={() => {
            setIsBuffering(true);
            setIsVideoReady(false);
          }}
          onLoadedMetadata={() => {
            const video = videoRef.current;
            if (!video) return;

            setDuration(video.duration || 0);
            video.volume = volume;
            video.playbackRate = speed;
          }}
          onCanPlay={async () => {
            setIsVideoReady(true);
            setIsBuffering(false);

            if (playRequested) {
              await safelyPlayVideo();
              setPlayRequested(false);
              showControlsTemporarily();
            }
          }}
          onWaiting={() => {
            setIsBuffering(true);
          }}
          onPlaying={() => {
            setIsBuffering(false);
            setIsPlaying(true);
          }}
          onPause={() => {
            setIsPlaying(false);
          }}
          onTimeUpdate={() => {
            const video = videoRef.current;
            if (!video) return;

            setCurrentTime(video.currentTime || 0);
          }}
          onEnded={() => {
            setIsPlaying(false);
            setPlayRequested(false);
            showControlsTemporarily();
          }}
          onError={() => {
            console.error("Video element error:", videoRef.current?.error);
            setIsBuffering(false);
            setIsVideoReady(false);
            setPlayRequested(false);
          }}
        />

        {isBuffering && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50">
            <Loader2 className="animate-spin text-blue-300" size={42} />

            <p className="mt-3 text-sm font-bold text-white">
              Loading video...
            </p>

            <p className="text-xs text-slate-300 mt-1">
              Preparing secure lesson playback
            </p>
          </div>
        )}

        {!isPlaying && controlsVisible && !isBuffering && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 z-40 m-auto h-20 w-20 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
          >
            <Play size={34} />
          </button>
        )}
      </div>

      <div
        className={`absolute left-0 right-0 bottom-0 z-50 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-16 space-y-4 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="relative"
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setShowPreview(false)}
        >
          {showPreview && duration > 0 && (
            <div
              className="absolute bottom-8 w-44 -translate-x-1/2 rounded-xl bg-black border border-white/20 shadow-2xl overflow-hidden pointer-events-none"
              style={{ left: `${hoverLeft}%`, maxWidth: "180px" }}
            >
              <div className="aspect-video bg-black">
                <video
                  ref={previewVideoRef}
                  src={src}
                  muted
                  preload="metadata"
                  className="w-full h-full object-cover bg-black"
                  onLoadedMetadata={() => {
                    const previewVideo = previewVideoRef.current;
                    if (!previewVideo) return;

                    try {
                      previewVideo.currentTime = hoverTime;
                      previewVideo.pause();
                    } catch {
                      // ignore preview seek errors
                    }
                  }}
                  onSeeked={() => {
                    const previewVideo = previewVideoRef.current;
                    if (!previewVideo) return;

                    previewVideo.pause();
                  }}
                />
              </div>

              <div className="text-center text-xs font-bold text-white py-1 bg-slate-950">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}

          <input
            ref={progressRef}
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full cursor-pointer"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={stopVideo}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
              title="Stop"
            >
              <Square size={16} />
            </button>

            <button
              onClick={() => seekVideo(-10)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
              title="Back 10 seconds"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={() => seekVideo(10)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
              title="Forward 10 seconds"
            >
              <RotateCw size={18} />
            </button>

            <span className="text-sm text-slate-300 whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <select
              value={speed}
              onChange={handleSpeedChange}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm outline-none border border-white/10"
            >
              <option className="bg-slate-900 text-white" value="0.5">
                0.5x
              </option>
              <option className="bg-slate-900 text-white" value="1">
                1x
              </option>
              <option className="bg-slate-900 text-white" value="1.25">
                1.25x
              </option>
              <option className="bg-slate-900 text-white" value="1.5">
                1.5x
              </option>
              <option className="bg-slate-900 text-white" value="2">
                2x
              </option>
            </select>

            <div className="flex items-center gap-2">
              <Volume2 size={18} className="text-slate-400" />

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24"
              />
            </div>

            <select
              disabled
              className="px-3 py-2 rounded-xl bg-slate-900 text-slate-400 text-sm outline-none border border-white/10"
            >
              <option>Auto Quality</option>
              <option>360p</option>
              <option>720p</option>
              <option>1080p</option>
            </select>

            <button
              onClick={toggleFullscreen}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
