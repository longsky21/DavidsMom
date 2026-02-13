import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, Star, Maximize, Minimize, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChildVideoPlayerProps {
  src: string;
  poster?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

const ChildVideoPlayer: React.FC<ChildVideoPlayerProps> = ({
  src,
  poster,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch handling
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress(video.currentTime);
      if (onTimeUpdate) onTimeUpdate(video.currentTime);
    };

    const handleDurationChange = () => setDuration(video.duration);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (onEnded) onEnded();
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleWebkitBeginFullscreen = () => {
      setIsFullscreen(true);
    };

    const handleWebkitEndFullscreen = () => {
      setIsFullscreen(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    video.addEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen as unknown as EventListener);
    video.addEventListener('webkitendfullscreen', handleWebkitEndFullscreen as unknown as EventListener);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      video.removeEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen as unknown as EventListener);
      video.removeEventListener('webkitendfullscreen', handleWebkitEndFullscreen as unknown as EventListener);
    };
  }, [onTimeUpdate, onEnded]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
      if (onPause) onPause();
    } else {
      video.play();
      setIsPlaying(true);
      resetControlsTimeout();
      if (onPlay) onPlay();
    }
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    };
    const container = containerRef.current;
    if (!video || !container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (video.requestFullscreen) {
        await video.requestFullscreen();
        return;
      }

      if (container.requestFullscreen) {
        await container.requestFullscreen();
        return;
      }

      if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch {
      if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
      if (videoRef.current) {
          videoRef.current.playbackRate = rate;
          setPlaybackRate(rate);
          setShowSettings(false);
          resetControlsTimeout();
      }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    if (isPlaying && !showSettings) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 3000);
    }
  };

  const handleContainerClick = () => {
    resetControlsTimeout();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(time);
    }
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
    }
    resetControlsTimeout();
  };

  // Simple gesture implementation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
    resetControlsTimeout();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const diffX = e.touches[0].clientX - touchStartRef.current.x;
    const diffY = e.touches[0].clientY - touchStartRef.current.y;
    
    // Threshold to detect swipe
    if (Math.abs(diffX) > 30 && Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal - Seek
        if (videoRef.current) {
            videoRef.current.currentTime += (diffX > 0 ? 0.5 : -0.5); // Sensitivity
        }
    } else if (Math.abs(diffY) > 30 && Math.abs(diffY) > Math.abs(diffX)) {
        // Vertical - Volume
        if (videoRef.current) {
            const newVol = Math.min(1, Math.max(0, volume + (diffY > 0 ? -0.02 : 0.02)));
            videoRef.current.volume = newVol;
            setVolume(newVol);
        }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-black rounded-2xl overflow-hidden group select-none ${isFullscreen ? 'rounded-none' : ''}`}
      onClick={handleContainerClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
      />

      {/* Loading Animation */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              <Star size={48} className="text-yellow-400 fill-yellow-400" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between z-10 bg-gradient-to-b from-black/30 via-transparent to-black/60 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
             {/* Top Controls */}
             <div className="flex items-center justify-end gap-2 relative">
                 <button
                    onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                    className="p-2 text-white/90 hover:text-yellow-400 bg-black/20 rounded-full backdrop-blur-sm"
                 >
                    {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                 </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                    className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full backdrop-blur-sm"
                 >
                     <Settings size={24} />
                 </button>

                 {/* Speed Menu */}
                 <AnimatePresence>
                     {showSettings && (
                         <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute top-12 right-0 bg-black/80 backdrop-blur-md rounded-xl p-2 flex flex-col gap-1 min-w-[80px]"
                         >
                             {[0.5, 1.0, 1.5, 2.0].map(rate => (
                                 <button
                                     key={rate}
                                     onClick={(e) => { e.stopPropagation(); changePlaybackRate(rate); }}
                                     className={`px-3 py-2 rounded-lg text-sm font-bold text-left ${playbackRate === rate ? 'bg-yellow-400 text-black' : 'text-white hover:bg-white/10'}`}
                                 >
                                     {rate}x
                                 </button>
                             ))}
                         </motion.div>
                     )}
                 </AnimatePresence>
             </div>

            {/* Center Play Button */}
            <div className="flex-1 flex items-center justify-center">
              {!isLoading && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="bg-white/20 backdrop-blur-sm p-4 rounded-full border-4 border-white text-white hover:bg-white/40 transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={48} fill="currentColor" />
                  ) : (
                    <Play size={48} fill="currentColor" className="ml-1" />
                  )}
                </motion.button>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Volume2 size={20} className="text-white" />
                        <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-24 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-green-400"
                        />
                    </div>
                    <div className="text-white/70 text-xs font-bold px-2 py-1 bg-black/20 rounded-full">
                      {playbackRate}x
                    </div>
                </div>

                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChildVideoPlayer;
