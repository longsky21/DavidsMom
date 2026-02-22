import React, { useEffect } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { Transcript } from './components/Transcript';
import { parseSRT } from './lib/srtParser';
import { Play, Pause, FastForward, Rewind, Repeat, Upload, Loader2 } from 'lucide-react';
import { usePlayerStore } from './store/usePlayerStore';
import axios from 'axios';

const WebPlayer: React.FC = () => {
  const { 
    isPlaying, setIsPlaying, currentTime, duration, playbackRate, setPlaybackRate,
    videoSrc, setVideoSrc, transcript, setTranscript, isTranscribing, setIsTranscribing
  } = usePlayerStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  // Handle file upload and transcription
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Set local video source
    const localUrl = URL.createObjectURL(file);
    setVideoSrc(localUrl);
    setTranscript([]); // Clear old transcript
    setIsPlaying(false);

    // 2. Call backend to transcribe
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Assuming backend runs on localhost:8001 (based on previous logs)
      const response = await axios.post('/api/media/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const srtString = response.data;
      const parsedTranscript = parseSRT(srtString);
      setTranscript(parsedTranscript);
    } catch (error) {
      console.error("Transcription failed:", error);
      alert("字幕生成失败，请检查后端服务");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-900 text-white flex flex-col md:flex-row overflow-hidden">
      
      {/* Left / Top: Video & Controls */}
      <div className="w-full md:w-2/3 h-1/2 md:h-full flex flex-col relative border-r border-slate-800">
        
        {/* Video Area */}
        <div className="flex-1 bg-black relative flex items-center justify-center">
          <VideoPlayer src={videoSrc} />
          
          {/* Transcribing Loader */}
          {isTranscribing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
              <Loader2 className="animate-spin text-yellow-400 mb-2" size={48} />
              <p className="text-yellow-400 font-bold">Generating subtitles with Whisper...</p>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="h-24 bg-slate-800 p-4 flex flex-col justify-between shadow-lg z-10">
            {/* Progress Bar */}
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mb-2">
                <span>{formatTime(currentTime)}</span>
                <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={(e) => usePlayerStore.getState().requestSeek(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span>{formatTime(duration)}</span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <label className="cursor-pointer p-2 hover:bg-white/10 rounded-full text-slate-300 transition-colors" title="Upload video & generate subtitles">
                        <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleFileUpload} />
                        <Upload size={20} />
                    </label>

                    <button className="p-2 hover:bg-white/10 rounded-full text-slate-300">
                        <Repeat size={20} />
                    </button>
                    <div className="text-sm font-bold bg-black/30 px-2 py-1 rounded cursor-pointer" onClick={() => {
                        const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                        const idx = rates.indexOf(playbackRate);
                        setPlaybackRate(rates[(idx + 1) % rates.length]);
                    }}>
                        {playbackRate}x
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button className="p-2 hover:text-yellow-400 transition-colors" onClick={() => usePlayerStore.getState().requestSeek(currentTime - 5)}>
                        <Rewind size={24} />
                    </button>
                    
                    <button 
                        onClick={togglePlay}
                        className="p-4 bg-yellow-400 text-black rounded-full hover:bg-yellow-300 transition-transform active:scale-95 shadow-lg shadow-yellow-400/20"
                    >
                        {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                    </button>

                    <button className="p-2 hover:text-yellow-400 transition-colors" onClick={() => usePlayerStore.getState().requestSeek(currentTime + 5)}>
                        <FastForward size={24} />
                    </button>
                </div>

                <div className="w-20" /> {/* Spacer for symmetry */}
            </div>
        </div>
      </div>

      {/* Right / Bottom: Transcript */}
      <div className="w-full md:w-1/3 h-1/2 md:h-full bg-slate-900 border-l border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-10 sticky top-0 shadow-sm">
            <h2 className="text-lg font-bold text-yellow-400">Transcript</h2>
            <p className="text-xs text-slate-500">
                {transcript.length > 0 ? "Click line to seek • Auto-scrolling enabled" : "Upload a video to generate subtitles"}
            </p>
        </div>
        <div className="flex-1 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
            <Transcript transcript={transcript} />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none" />
        </div>
      </div>

    </div>
  );
};

export default WebPlayer;
