import { create } from 'zustand';
import { TranscriptLine } from '../lib/srtParser';

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  seekRequest: number | null;
  
  // New fields
  videoSrc: string;
  transcript: TranscriptLine[];
  isTranscribing: boolean;
  
  // Actions
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  requestSeek: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  
  // New actions
  setVideoSrc: (src: string) => void;
  setTranscript: (transcript: TranscriptLine[]) => void;
  setIsTranscribing: (isTranscribing: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  volume: 1.0,
  seekRequest: null,
  
  videoSrc: "https://cdn.diegodad.com/gear-test/sample/dieba/resourceFile/2022/08/13/83aa9e91-bc32-4f5b-8642-fb3148451478.mp4",
  transcript: [],
  isTranscribing: false,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  requestSeek: (time) => set({ seekRequest: time, currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setVolume: (volume) => set({ volume }),
  
  setVideoSrc: (videoSrc) => set({ videoSrc }),
  setTranscript: (transcript) => set({ transcript }),
  setIsTranscribing: (isTranscribing) => set({ isTranscribing }),
}));
