import { useRef, useState } from "react";
import {
  Maximize,
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

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const VideoPlayer = ({ src, title }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  const isYouTube = isYouTubeUrl(src);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const stopVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seekVideo = (seconds) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const handleProgressChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Number(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSpeedChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newSpeed = Number(e.target.value);
    video.playbackRate = newSpeed;
    setSpeed(newSpeed);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = Number(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
  };

  const openFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (container.requestFullscreen) {
      container.requestFullscreen();
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
            YouTube preview mode. Full custom controls will work with S3/HLS/MP4 videos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-3xl bg-black border border-white/10 overflow-hidden"
    >
      <div className="aspect-video bg-black">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full"
          onLoadedMetadata={() => setDuration(videoRef.current.duration)}
          onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      <div className="p-4 bg-slate-950 border-t border-white/10 space-y-4">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleProgressChange}
          className="w-full"
        />

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
            >
              <Square size={16} />
            </button>

            <button
              onClick={() => seekVideo(-10)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={() => seekVideo(10)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
            >
              <RotateCw size={18} />
            </button>

            <span className="text-sm text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={speed}
              onChange={handleSpeedChange}
              className="px-3 py-2 rounded-xl bg-white/10 text-white text-sm outline-none"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
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
              className="px-3 py-2 rounded-xl bg-white/10 text-slate-400 text-sm outline-none"
            >
              <option>Auto Quality</option>
              <option>360p</option>
              <option>720p</option>
              <option>1080p</option>
            </select>

            <button
              onClick={openFullscreen}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;