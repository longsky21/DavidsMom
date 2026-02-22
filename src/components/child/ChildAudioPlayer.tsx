import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChildAudioPlayerProps {
  src: string;
  title: string;
  seekTime?: number; // Add seekTime prop
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

const ChildAudioPlayer: React.FC<ChildAudioPlayerProps> = ({
  src,
  title,
  seekTime,
  onPlay,
  onPause,
  onEnded,
  onNext,
  onPrev,
  onTimeUpdate
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle seek request
  useEffect(() => {
    if (seekTime !== undefined && seekTime !== null && audioRef.current) {
        // Only seek if difference is significant to avoid loops
        if (Math.abs(audioRef.current.currentTime - seekTime) > 0.5) {
            audioRef.current.currentTime = seekTime;
            setProgress(seekTime);
            if (audioRef.current.paused) {
                audioRef.current.play();
                setIsPlaying(true);
                if (onPlay) onPlay();
            }
        }
    }
  }, [seekTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      if (onTimeUpdate) onTimeUpdate(audio.currentTime);
    };

    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onEnded]);

  // Reset state when src changes
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    // Auto-play when song changes if user was already interacting? 
    // Usually good practice to not auto-play unless in a playlist flow.
    // But if we have onNext/onPrev, maybe auto-play is expected.
    // For now, let parent handle auto-play logic via props or ref if needed.
    // Actually, simply calling .play() here if src changes might be blocked by browser policy unless initiated by user.
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (onPause) onPause();
    } else {
      audio.play();
      setIsPlaying(true);
      if (onPlay) onPlay();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      layout
      className={`bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-blue-100 ${isExpanded ? 'p-6' : 'p-3'}`}
      initial={{ height: 'auto' }}
    >
      <audio ref={audioRef} src={src} />

      {isExpanded ? (
        // Full Player Mode
        <div className="flex flex-col items-center">
          {/* Header */}
          <div className="w-full flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Now Playing</span>
            <button onClick={() => setIsExpanded(false)} className="text-gray-400 hover:text-gray-600">
              <Minimize2 size={20} />
            </button>
          </div>

          {/* Album Art / Visualizer */}
          <div className="w-48 h-48 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
             {/* Simple Pulse Animation */}
             {isPlaying && (
                <>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-blue-100 rounded-full opacity-50"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                    className="absolute inset-0 bg-blue-200 rounded-full opacity-30"
                  />
                </>
             )}
             <Music size={64} className="text-blue-500 z-10" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-gray-800 text-center mb-2 px-4 truncate w-full">
            {title}
          </h2>

          {/* Progress Bar */}
          <div className="w-full mb-6">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs font-bold text-gray-400 mt-1">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <button 
                onClick={onPrev} 
                className="p-3 text-gray-400 hover:text-blue-500 transition-colors"
                disabled={!onPrev}
            >
              <SkipBack size={28} />
            </button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200 hover:bg-blue-600 transition-colors"
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </motion.button>

            <button 
                onClick={onNext} 
                className="p-3 text-gray-400 hover:text-blue-500 transition-colors"
                disabled={!onNext}
            >
              <SkipForward size={28} />
            </button>
          </div>
        </div>
      ) : (
        // Mini Player Mode
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Music size={20} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                    <div className="font-bold text-gray-800 truncate pr-2">{title}</div>
                    <div className="text-xs text-gray-400">{formatTime(progress)} / {formatTime(duration)}</div>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"
                >
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                </button>
                <button 
                    onClick={() => setIsExpanded(true)}
                    className="p-2 text-gray-400"
                >
                    <Maximize2 size={20} />
                </button>
            </div>
        </div>
      )}
    </motion.div>
  );
};

export default ChildAudioPlayer;
