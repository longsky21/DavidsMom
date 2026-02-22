import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { ChevronDown, ChevronRight, Play, Star, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';
import ChildLayout from '@/components/child/ChildLayout';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/player/store/usePlayerStore';
import { Transcript } from '@/player/components/Transcript';
import { parseSRT, type TranscriptLine } from '@/player/lib/srtParser';
import ChildVideoPlayer from '@/components/child/ChildVideoPlayer';

interface MediaResource {
  id: string;
  filename: string;
  url: string;
  directory?: string | null;
  difficulty_level: number;
  srt_file?: string | null;
}

interface MediaPlanItem {
  id: string;
  resource: MediaResource;
}

interface StartSessionResponse {
  id: string;
}
const nameCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const ChildVideosPlayer: React.FC = () => {
  const navigate = useNavigate();
  const childToken = useStore((s: UserState) => s.childToken);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${childToken}` }), [childToken]);

  // Player Store
  const { 
    setCurrentTime, 
    setIsPlaying, 
    requestSeek, 
    seekRequest, 
    isPlaying: storeIsPlaying 
  } = usePlayerStore();

  const [planItems, setPlanItems] = useState<MediaPlanItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playedMs, setPlayedMs] = useState<number>(0);
  const [playingSince, setPlayingSince] = useState<number | null>(null);
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  
  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  const selected = useMemo(() => planItems.find((x) => x.id === selectedId) || null, [planItems, selectedId]);

  // Fetch SRT when selected video changes
  useEffect(() => {
    const loadSRT = async () => {
      if (selected?.resource.srt_file) {
        try {
          // Construct URL - assuming srt_file is relative path like 'uploads/...'
          // If it starts with http, use as is. Otherwise prepend / (vite proxy handles it)
          let url = selected.resource.srt_file;
          if (!url.startsWith('http') && !url.startsWith('/')) {
             url = '/' + url;
          }
          
          const { data } = await axios.get(url);
          const parsed = parseSRT(data);
          setTranscript(parsed);
        } catch (e) {
          console.error('Failed to load SRT', e);
          setTranscript([]);
        }
      } else {
        setTranscript([]);
      }
    };
    
    loadSRT();
  }, [selected]);
  const groupedItems = useMemo(() => {
    const map = new Map<string, MediaPlanItem[]>();
    planItems.forEach((item) => {
      const dir = item.resource.directory?.trim() || '未分组';
      const list = map.get(dir);
      if (list) list.push(item);
      else map.set(dir, [item]);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => nameCollator.compare(a, b))
      .map(([directory, list]) => ({
        directory,
        items: list.sort((x, y) => nameCollator.compare(x.resource.filename, y.resource.filename)),
      }));
  }, [planItems]);
  const flatItems = useMemo(() => groupedItems.flatMap((group) => group.items), [groupedItems]);

  const fetchPlan = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/media/child/plan', {
        params: { module: 'video' },
        headers: authHeaders,
      });
      const items = data as MediaPlanItem[];
      setPlanItems(items);
    } catch {
      Toast.show({ content: '加载视频失败', icon: 'fail' });
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Reset store when component unmounts
  useEffect(() => {
      return () => {
          setIsPlaying(false);
          setCurrentTime(0);
      };
  }, []);

  const flushPlayedMs = () => {
    if (playingSince) {
      const now = Date.now();
      setPlayedMs((prev) => prev + (now - playingSince));
      setPlayingSince(now);
    }
  };

  const finishSession = async (reason: 'switch' | 'leave' | 'ended') => {
    if (!sessionId) return;
    const durationSeconds = Math.max(0, Math.round(playedMs / 1000));
    try {
      await axios.post(
        `/api/media/session/${sessionId}/finish`,
        { 
            duration_seconds: durationSeconds, 
            completion_percent: 100, // simplified for now
            completed_count: reason === 'ended' ? 1 : 0 
        },
        { headers: authHeaders }
      );
    } catch {
      if (reason !== 'leave') console.error('Failed to save session');
    } finally {
      setSessionId(null);
      setPlayedMs(0);
      setPlayingSince(null);
    }
  };

  const startSession = async (resourceId: string) => {
    try {
      const { data } = await axios.post(
        '/api/media/session/start',
        { resource_id: resourceId, module: 'video' },
        { headers: authHeaders }
      );
      setSessionId((data as StartSessionResponse).id);
      setPlayedMs(0);
      setPlayingSince(Date.now());
    } catch {
      Toast.show({ content: '开始学习失败', icon: 'fail' });
    }
  };

  const handleSelect = async (id: string) => {
    if (id === selectedId) return;
    await finishSession('switch');
    setSelectedId(id);
    // Auto start play logic is handled in onPlay of VideoPlayer
  };

  const handleBack = async () => {
    await finishSession('leave');
    navigate('/child');
  };

  const handleVideoClick = async () => {
      if (!selected) {
          if (flatItems.length > 0) {
              const firstItem = flatItems[0];
              setSelectedId(firstItem.id);
          }
      }
  };

  return (
    <ChildLayout bgClass="bg-green-50" onBack={handleBack}>
      <div className="flex flex-col h-full w-full lg:max-w-7xl mx-auto p-2 lg:p-4 gap-4">
        
        {/* Top Section: Video Player + (Optional) Desktop Transcript */}
        <div className="flex flex-col lg:flex-row gap-4 w-full">
            {/* Video Player Container */}
            <div className={`
                flex-col flex 
                ${transcript.length > 0 ? 'lg:w-3/4' : 'w-full lg:max-w-4xl lg:mx-auto'}
            `}>
                <h1 className="text-3xl font-black text-green-600 mb-4 px-2 drop-shadow-sm font-cartoon tracking-wide lg:hidden">
                    Fun Video
                </h1>

                {/* Video Player */}
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-white relative shrink-0" onClick={handleVideoClick}>
                    {selected ? (
                        <ChildVideoPlayer 
                            src={selected.resource.url}
                            seekTime={seekRequest} // Sync: Store -> Player
                            onPlay={async () => {
                                setIsPlaying(true); // Sync: Player -> Store
                                if (!sessionId && selected?.resource?.id) await startSession(selected.resource.id);
                                if (!playingSince) setPlayingSince(Date.now());
                            }}
                            onPause={() => {
                                setIsPlaying(false); // Sync: Player -> Store
                                if (playingSince) {
                                    const now = Date.now();
                                    setPlayedMs((prev) => prev + (now - playingSince));
                                    setPlayingSince(null);
                                }
                            }}
                            onTimeUpdate={(t) => {
                                setCurrentTime(t); // Sync: Player -> Store
                                flushPlayedMs();
                            }}
                            onEnded={async () => {
                                setIsPlaying(false);
                                await finishSession('ended');
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-gray-900">
                            <Play size={64} className="mb-4 opacity-50" />
                            <p className="font-bold text-lg">Choose a video to play!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop Transcript (Right side of video, same height approx via aspect-ratio or flex) */}
            {transcript.length > 0 && (
                <div className="hidden lg:block lg:w-1/4 aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl relative">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
                    <Transcript transcript={transcript} />
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none" />
                </div>
            )}
        </div>

        {/* Mobile Transcript (Below video) */}
        {transcript.length > 0 && (
            <div className="lg:hidden mb-6 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl h-[300px] relative">
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
                <Transcript transcript={transcript} />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none" />
            </div>
        )}

        {/* Bottom Section: Video List (Full Width) */}
        <div className="w-full flex-1 overflow-y-auto bg-white/50 rounded-2xl shadow-sm border border-white/50 p-4">
             <h1 className="text-2xl font-black text-green-600 mb-4 px-2 drop-shadow-sm font-cartoon tracking-wide">
                Video List
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 lg:pb-4">
                {groupedItems.map((group) => (
                    <div key={group.directory} className="col-span-full space-y-2">
                        <div className="flex items-center justify-between px-1 sticky top-0 bg-white/80 backdrop-blur-md p-2 rounded-lg z-10">
                            <div className="text-sm font-bold text-gray-600">{group.directory}</div>
                            <button
                                type="button"
                                className="flex items-center gap-1 text-sm text-gray-500 px-1 py-0.5 hover:bg-gray-100 rounded"
                                onClick={() => {
                                    setHiddenGroups((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(group.directory)) next.delete(group.directory);
                                        else next.add(group.directory);
                                        return next;
                                    });
                                }}
                            >
                                <span className="text-green-700 font-bold bg-green-100 px-1.5 rounded text-xs">{group.items.length}</span>
                                {hiddenGroups.has(group.directory) ? (
                                    <ChevronRight size={16} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={16} className="text-gray-400" />
                                )}
                            </button>
                        </div>
                        {!hiddenGroups.has(group.directory) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {group.items.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSelect(item.id)}
                                        className={`
                                            bg-white p-3 rounded-xl shadow-sm border cursor-pointer flex items-center gap-3 transition-all h-full
                                            ${selectedId === item.id ? 'border-green-500 ring-2 ring-green-200 bg-green-50' : 'border-transparent hover:border-green-200'}
                                        `}
                                    >
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner
                                            ${selectedId === item.id ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'}
                                        `}>
                                            {selectedId === item.id ? <Play size={16} fill="currentColor" /> : <Play size={16} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`font-bold text-sm truncate ${selectedId === item.id ? 'text-green-900' : 'text-gray-800'}`}>{item.resource.filename}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                                                Level {item.resource.difficulty_level}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                
                {planItems.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400 font-medium">
                        No videos found. Ask mom or dad to add some!
                    </div>
                )}
            </div>
        </div>
      </div>
    </ChildLayout>
  );
};

export default ChildVideosPlayer;
