import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
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

const getVideoErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 1:
      return "Video loading was aborted.";
    case 2:
      return "Network error while loading video.";
    case 3:
      return "Browser could not decode this video.";
    case 4:
      return "Video URL or format is not supported.";
    default:
      return "Unknown video playback error.";
  }
};

const getSafeSeconds = (value) => {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.max(0, Math.floor(numberValue));
};

const getUniqueHlsQualityLevels = (levels = []) => {
  const bestLevelByHeight = new Map();

  levels.forEach((level, index) => {
    const height = Number(level?.height || 0);
    const bitrate = Number(level?.bitrate || 0);

    if (!height) return;

    const existingLevel = bestLevelByHeight.get(height);

    if (!existingLevel || bitrate > existingLevel.bitrate) {
      bestLevelByHeight.set(height, {
        index,
        height,
        bitrate,
        label: `${height}p`,
      });
    }
  });

  return [...bestLevelByHeight.values()].sort((a, b) => b.height - a.height);
};

const isEditableElement = (element) => {
  if (!element) return false;

  const tagName = element.tagName?.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button" ||
    tagName === "a" ||
    element.isContentEditable
  );
};

const isInteractivePlayerTarget = (target) => {
  return Boolean(
    target instanceof Element &&
    target.closest("button, select, input, a, [data-video-control='true']"),
  );
};

const VideoPlayer = ({
  src,
  title,
  type = "mp4",
  startTime = 0,
  onEnded,
  onError,
  onProgressSave,
  progressSaveIntervalSeconds = 10,
}) => {
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const hlsRef = useRef(null);
  const lastUserToggleAtRef = useRef(0);

  const onErrorRef = useRef(onError);
  const onProgressSaveRef = useRef(onProgressSave);

  const initialSeekAppliedRef = useRef(false);
  const pendingSeekTimeRef = useRef(0);
  const shouldResumePlaybackRef = useRef(false);
  const lastSavedSecondRef = useRef(0);

  const latestPlaybackRef = useRef({
    currentTime: 0,
    duration: 0,
  });

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
  const [isBuffering, setIsBuffering] = useState(Boolean(src));
  const [playRequested, setPlayRequested] = useState(false);
  const [playerError, setPlayerError] = useState("");

  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [activeAutoQuality, setActiveAutoQuality] = useState("");

  const isYouTube = isYouTubeUrl(src || "");

  const isHlsSource =
    type === "hls" ||
    String(src || "")
      .toLowerCase()
      .includes(".m3u8");

  const hasRealHlsQuality =
    isHlsSource && Hls.isSupported() && qualityLevels.length > 0;

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onProgressSaveRef.current = onProgressSave;
  }, [onProgressSave]);

  const notifyError = (message) => {
    if (typeof onErrorRef.current === "function") {
      onErrorRef.current(message);
    }
  };

  const showControlsTemporarily = () => {
    setControlsVisible(true);

    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  };

  const saveWatchPosition = (reason = "interval", force = false) => {
    if (isYouTube || typeof onProgressSaveRef.current !== "function") return;

    const video = videoRef.current;

    const safeCurrentTime = getSafeSeconds(
      video?.currentTime ?? latestPlaybackRef.current.currentTime,
    );

    const safeDuration = getSafeSeconds(
      video?.duration ?? latestPlaybackRef.current.duration,
    );

    if (!force && safeCurrentTime < 1) return;
    if (!force && safeCurrentTime === lastSavedSecondRef.current) return;

    lastSavedSecondRef.current = safeCurrentTime;

    onProgressSaveRef.current({
      currentTime: safeCurrentTime,
      duration: safeDuration,
      reason,
    });
  };

  const applyPendingSeekTime = () => {
    const video = videoRef.current;

    if (!video || initialSeekAppliedRef.current) return;

    const safeStartTime = getSafeSeconds(
      pendingSeekTimeRef.current || startTime,
    );

    if (safeStartTime <= 0) {
      initialSeekAppliedRef.current = true;
      return;
    }

    const safeDuration = Number(video.duration || duration || 0);

    if (safeDuration > 0 && safeStartTime >= safeDuration - 3) {
      initialSeekAppliedRef.current = true;
      return;
    }

    try {
      video.currentTime = safeStartTime;
      setCurrentTime(safeStartTime);
      latestPlaybackRef.current.currentTime = safeStartTime;
      initialSeekAppliedRef.current = true;
    } catch (error) {
      console.warn("Unable to restore video watch position:", error);
    }
  };

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
      saveWatchPosition("pause", true);
      video.pause();
      setIsPlaying(false);
    }

    showControlsTemporarily();
  };

  const handleUserTogglePlay = async () => {
    lastUserToggleAtRef.current = Date.now();
    await togglePlay();
  };

  const stopVideo = () => {
    const video = videoRef.current;

    if (!video) return;

    video.pause();
    video.currentTime = 0;

    latestPlaybackRef.current.currentTime = 0;
    lastSavedSecondRef.current = 0;

    if (typeof onProgressSaveRef.current === "function") {
      onProgressSaveRef.current({
        currentTime: 0,
        duration: getSafeSeconds(video.duration || duration),
        reason: "stop",
      });
    }

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
    latestPlaybackRef.current.currentTime = nextTime;
    saveWatchPosition("seek", true);
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

  const handleVideoSurfacePointerUp = async (event) => {
    if (isInteractivePlayerTarget(event.target)) return;

    const timeSinceUserButtonToggle = Date.now() - lastUserToggleAtRef.current;

    if (timeSinceUserButtonToggle < 450) return;

    await handleUserTogglePlay();
  };

  const handleCenterPlayPointerUp = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    await handleUserTogglePlay();
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
    const handleKeyboardControls = (event) => {
      if (isYouTube) return;
      if (!src) return;
      if (isEditableElement(document.activeElement)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (event.code === "Space" || key === " ") {
        if (event.repeat) return;

        event.preventDefault();
        handleUserTogglePlay();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekVideo(-10);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        seekVideo(10);
        return;
      }

      if (key === "f") {
        if (event.repeat) return;

        event.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener("keydown", handleKeyboardControls);

    return () => {
      document.removeEventListener("keydown", handleKeyboardControls);
    };
  }, [src, isYouTube, isVideoReady, duration, currentTime]);

  useEffect(() => {
    if (isPlaying) {
      showControlsTemporarily();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;

    const previousTime = getSafeSeconds(video?.currentTime || currentTime);
    const wasPlaying = Boolean(video && !video.paused && !video.ended);

    pendingSeekTimeRef.current =
      previousTime > 1 ? previousTime : getSafeSeconds(startTime);

    shouldResumePlaybackRef.current = wasPlaying;

    initialSeekAppliedRef.current = false;
    lastSavedSecondRef.current = 0;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setShowPreview(false);
    setControlsVisible(true);
    setIsVideoReady(false);
    setIsBuffering(Boolean(src));
    setPlayRequested(false);
    setPlayerError("");
    setQualityLevels([]);
    setSelectedQuality("auto");
    setActiveAutoQuality("");
  }, [src, type, startTime]);

  useEffect(() => {
    const safeStartTime = getSafeSeconds(startTime);

    if (safeStartTime <= 0) return;

    pendingSeekTimeRef.current = safeStartTime;

    if (isVideoReady && !initialSeekAppliedRef.current) {
      applyPendingSeekTime();
    }
  }, [startTime, isVideoReady]);

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
      const safeCurrentTime = getSafeSeconds(
        latestPlaybackRef.current.currentTime,
      );

      if (
        safeCurrentTime > 0 &&
        typeof onProgressSaveRef.current === "function"
      ) {
        onProgressSaveRef.current({
          currentTime: safeCurrentTime,
          duration: getSafeSeconds(latestPlaybackRef.current.duration),
          reason: "unmount",
        });
      }

      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !src || isYouTube) {
      setIsBuffering(false);
      return undefined;
    }

    setPlayerError("");
    setIsBuffering(true);
    setIsVideoReady(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (isHlsSource) {
      video.crossOrigin = "use-credentials";

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          xhrSetup: (xhr) => {
            xhr.withCredentials = true;
          },
        });

        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = getUniqueHlsQualityLevels(hls.levels || []);

          console.log("HLS_LEVELS_READY:", levels);

          setQualityLevels(levels);
          setSelectedQuality("auto");
          setActiveAutoQuality("");
          setIsVideoReady(true);
          setIsBuffering(false);
          applyPendingSeekTime();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const activeLevel = hls.levels?.[data.level];

          if (activeLevel?.height) {
            setActiveAutoQuality(`${activeLevel.height}p`);
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error("HLS_PLAYER_ERROR:", data);

          if (!data?.fatal) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }

          const message =
            data?.details || data?.type || "Unable to play HLS video.";

          setPlayerError(message);
          setIsBuffering(false);
          setIsVideoReady(false);
          setPlayRequested(false);
          notifyError(message);

          hls.destroy();
        });

        return () => {
          hls.destroy();

          if (hlsRef.current === hls) {
            hlsRef.current = null;
          }
        };
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.load();

        setQualityLevels([]);
        setSelectedQuality("auto");
        setActiveAutoQuality("");
        setIsVideoReady(true);
        setIsBuffering(false);

        return undefined;
      }

      const message = "This browser does not support HLS playback.";

      setPlayerError(message);
      setIsBuffering(false);
      setIsVideoReady(false);
      setPlayRequested(false);
      notifyError(message);

      return undefined;
    }

    video.removeAttribute("crossorigin");
    video.src = src;
    video.load();

    return undefined;
  }, [src, type, isHlsSource, isYouTube]);

  const handleProgressChange = (event) => {
    const video = videoRef.current;

    if (!video) return;

    const newTime = Number(event.target.value);

    video.currentTime = newTime;
    setCurrentTime(newTime);
    latestPlaybackRef.current.currentTime = newTime;
    saveWatchPosition("seek", true);
    showControlsTemporarily();
  };

  const handleProgressHover = (event) => {
    if (!progressRef.current || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
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
        // Ignore preview seek errors.
      }
    }
  };

  const handleSpeedChange = (event) => {
    const video = videoRef.current;

    if (!video) return;

    const newSpeed = Number(event.target.value);

    video.playbackRate = newSpeed;
    setSpeed(newSpeed);
    showControlsTemporarily();
  };

  const handleVolumeChange = (event) => {
    const video = videoRef.current;

    if (!video) return;

    const newVolume = Number(event.target.value);

    video.volume = newVolume;
    setVolume(newVolume);
    showControlsTemporarily();
  };

  const handleQualityChange = (event) => {
    const value = event.target.value;
    setSelectedQuality(value);

    const hls = hlsRef.current;

    if (!hls) return;

    if (value === "auto") {
      hls.currentLevel = -1;
      hls.loadLevel = -1;
      return;
    }

    const levelIndex = Number(value);

    if (!Number.isFinite(levelIndex)) return;

    hls.currentLevel = levelIndex;
    hls.loadLevel = levelIndex;
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    const mediaError = video?.error;

    const message = getVideoErrorMessage(mediaError?.code);

    console.error("Video element error:", {
      error: mediaError,
      code: mediaError?.code,
      message,
      currentSrc: video?.currentSrc,
      networkState: video?.networkState,
      readyState: video?.readyState,
      sourceType: type,
      src,
    });

    setPlayerError(message);
    setIsBuffering(false);
    setIsVideoReady(false);
    setPlayRequested(false);
    notifyError(message);
  };

  if (isYouTube) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
        <div className="aspect-video bg-black">
          <iframe
            src={getYouTubeEmbedUrl(src)}
            title={title || "Course video"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            YouTube preview mode. Full custom controls work with uploaded lesson
            videos.
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
      className={`relative overflow-hidden border bg-black outline-none ${
        isFullscreen
          ? "fixed inset-0 z-[9999] rounded-none border-black"
          : "rounded-3xl border-slate-200 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:shadow-black/20"
      }`}
    >
      <div
        className={`${isFullscreen ? "h-screen" : "aspect-video"} cursor-pointer touch-manipulation bg-black`}
        onPointerUp={handleVideoSurfacePointerUp}
      >
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          preload="metadata"
          playsInline
          crossOrigin={isHlsSource ? "use-credentials" : undefined}
          onLoadStart={() => {
            setIsBuffering(true);
            setIsVideoReady(false);
          }}
          onLoadedMetadata={() => {
            const video = videoRef.current;

            if (!video) return;

            setDuration(video.duration || 0);
            latestPlaybackRef.current.duration = video.duration || 0;
            video.volume = volume;
            video.playbackRate = speed;
            applyPendingSeekTime();
          }}
          onCanPlay={async () => {
            setIsVideoReady(true);
            setIsBuffering(false);
            applyPendingSeekTime();

            if (playRequested || shouldResumePlaybackRef.current) {
              await safelyPlayVideo();
              setPlayRequested(false);
              shouldResumePlaybackRef.current = false;
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
            saveWatchPosition("pause", true);
            setIsPlaying(false);
          }}
          onTimeUpdate={() => {
            const video = videoRef.current;

            if (!video) return;

            const nextCurrentTime = video.currentTime || 0;
            const nextDuration = video.duration || duration || 0;

            setCurrentTime(nextCurrentTime);

            latestPlaybackRef.current = {
              currentTime: nextCurrentTime,
              duration: nextDuration,
            };

            const safeCurrentSecond = getSafeSeconds(nextCurrentTime);

            if (
              safeCurrentSecond - lastSavedSecondRef.current >=
              progressSaveIntervalSeconds
            ) {
              saveWatchPosition("interval");
            }
          }}
          onEnded={() => {
            saveWatchPosition("ended", true);

            setIsPlaying(false);
            setPlayRequested(false);
            latestPlaybackRef.current.currentTime = 0;
            showControlsTemporarily();

            if (typeof onEnded === "function") {
              onEnded();
            }
          }}
          onError={handleVideoError}
        />

        {isBuffering && !playerError && (
          <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50">
            <Loader2 className="animate-spin text-blue-300" size={42} />

            <p className="mt-3 text-sm font-bold text-white">
              Loading video...
            </p>

            <p className="mt-1 text-xs text-slate-300">
              Preparing secure lesson playback
            </p>
          </div>
        )}

        {playerError && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
            <p className="text-lg font-black text-red-300">
              Video playback error
            </p>

            <p className="mt-2 max-w-xl text-sm text-slate-300">
              {playerError}
            </p>
          </div>
        )}

        {!isPlaying && controlsVisible && !isBuffering && !playerError && (
          <button
            type="button"
            onPointerUp={handleCenterPlayPointerUp}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            className="absolute inset-0 z-[60] m-auto flex h-20 w-20 touch-manipulation items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 active:scale-95"
            aria-label="Play video"
            title="Play"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Play size={34} />
          </button>
        )}
      </div>

      <div
        data-video-control="true"
        onClick={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 z-50 space-y-4 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-16 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="relative"
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setShowPreview(false)}
        >
          {showPreview && duration > 0 && !isHlsSource && (
            <div
              className="pointer-events-none absolute bottom-8 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl"
              style={{ left: `${hoverLeft}%`, maxWidth: "180px" }}
            >
              <div className="aspect-video bg-black">
                <video
                  ref={previewVideoRef}
                  src={src}
                  muted
                  preload="metadata"
                  className="h-full w-full bg-black object-cover"
                  onLoadedMetadata={() => {
                    const previewVideo = previewVideoRef.current;

                    if (!previewVideo) return;

                    try {
                      previewVideo.currentTime = hoverTime;
                      previewVideo.pause();
                    } catch {
                      // Ignore preview seek errors.
                    }
                  }}
                  onSeeked={() => {
                    const previewVideo = previewVideoRef.current;

                    if (!previewVideo) return;

                    previewVideo.pause();
                  }}
                />
              </div>

              <div className="bg-slate-950 py-1 text-center text-xs font-bold text-white">
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
            className="w-full cursor-pointer accent-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              type="button"
              onClick={stopVideo}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
              title="Stop"
            >
              <Square size={16} />
            </button>

            <button
              type="button"
              onClick={() => seekVideo(-10)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
              title="Back 10 seconds (←)"
            >
              <RotateCcw size={18} />
            </button>

            <button
              type="button"
              onClick={() => seekVideo(10)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
              title="Forward 10 seconds (→)"
            >
              <RotateCw size={18} />
            </button>

            <span className="whitespace-nowrap text-sm text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Volume2 size={18} />

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 cursor-pointer accent-blue-500"
              />
            </div>

            <select
              value={speed}
              onChange={handleSpeedChange}
              className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-sm font-bold text-white outline-none"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            {hasRealHlsQuality && (
              <select
                value={selectedQuality}
                onChange={handleQualityChange}
                className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-sm font-bold text-white outline-none"
              >
                <option value="auto">
                  {activeAutoQuality ? `Auto (${activeAutoQuality})` : "Auto"}
                </option>

                {qualityLevels.map((level) => (
                  <option
                    key={`${level.index}-${level.label}`}
                    value={String(level.index)}
                  >
                    {level.label}
                  </option>
                ))}
              </select>
            )}

            {isHlsSource && !hasRealHlsQuality && (
              <span className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-sm font-bold text-white">
                HLS Auto
              </span>
            )}

            {!isHlsSource && (
              <span className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-sm font-bold text-white">
                MP4
              </span>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
              title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
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
