import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

interface VideoPlayerProps {
  src: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { 
    isPlaying, 
    playbackRate, 
    volume,
    setIsPlaying, 
    setCurrentTime, 
    setDuration,
    seekRequest
  } = usePlayerStore();

  // Sync state -> audio
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => setIsPlaying(false));
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying, setIsPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle seek requests
  useEffect(() => {
    if (videoRef.current && seekRequest !== null) {
        // Only seek if difference is significant to avoid jitter
        if (Math.abs(videoRef.current.currentTime - seekRequest) > 0.1) {
            videoRef.current.currentTime = seekRequest;
        }
    }
  }, [seekRequest]);

  // Sync audio -> state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;

    const updateTime = () => {
      // Direct update to store might be too frequent for React rendering if we just use state
      // But Zustand is fast. Let's see. 
      // For smoother UI, we might use a transient update or just throttle.
      // For now, let's update every frame.
      setCurrentTime(video.currentTime);
      if (!video.paused) {
        animationFrameId = requestAnimationFrame(updateTime);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      animationFrameId = requestAnimationFrame(updateTime);
    };

    const handlePause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameId);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameId);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };
    
    // Also listen to timeupdate as a backup
    // video.addEventListener('timeupdate', () => setCurrentTime(video.currentTime));

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('durationchange', handleDurationChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [setCurrentTime, setIsPlaying, setDuration]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="w-full h-full object-contain bg-black rounded-lg shadow-lg"
      playsInline
      controls={false} // Custom controls
    />
  );
};
