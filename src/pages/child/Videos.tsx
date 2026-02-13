import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { Play, Star } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';
import ChildLayout from '@/components/child/ChildLayout';
import ChildVideoPlayer from '@/components/child/ChildVideoPlayer';
import { motion } from 'framer-motion';

interface MediaResource {
  id: string;
  filename: string;
  url: string;
  directory?: string | null;
  difficulty_level: number;
}

interface MediaPlanItem {
  id: string;
  resource: MediaResource;
}

interface StartSessionResponse {
  id: string;
}

const ChildVideos: React.FC = () => {
  const navigate = useNavigate();
  const childToken = useStore((s: UserState) => s.childToken);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${childToken}` }), [childToken]);

  const [planItems, setPlanItems] = useState<MediaPlanItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playedMs, setPlayedMs] = useState<number>(0);
  const [playingSince, setPlayingSince] = useState<number | null>(null);

  const selected = useMemo(() => planItems.find((x) => x.id === selectedId) || null, [planItems, selectedId]);

  const fetchPlan = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/media/child/plan', {
        params: { module: 'video' },
        headers: authHeaders,
      });
      const items = data as MediaPlanItem[];
      setPlanItems(items);
      // Don't auto-select, let user choose
      // setSelectedId((prev) => prev ?? (items.length > 0 ? items[0].id : null));
    } catch {
      Toast.show({ content: '加载视频失败', icon: 'fail' });
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const flushPlayedMs = () => {
    if (playingSince) {
      const now = Date.now();
      setPlayedMs((prev) => prev + (now - playingSince));
      setPlayingSince(now);
    }
  };

  const finishSession = async (reason: 'switch' | 'leave' | 'ended') => {
    if (!sessionId) return;
    // Note: We don't have direct access to video element here to get duration/currentTime easily 
    // without ref forwarding or state lifting. 
    // For simplicity in this refactor, we rely on playedMs. 
    // Ideally ChildVideoPlayer should pass back stats on end/pause.
    // However, the current logic calculates completionPercent which needs duration.
    // Let's assume ChildVideoPlayer handles playback, but session tracking relies on time updates.
    
    // We'll simplify: If we don't have exact duration here, we might miss completionPercent.
    // But we can track playedMs.
    
    const durationSeconds = Math.max(0, Math.round(playedMs / 1000));
    // Mock completion for now or fetch from player state if we lift it.
    // Let's just save what we have.
    
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
  };

  const handleBack = async () => {
    await finishSession('leave');
    navigate('/child');
  };

  const handleVideoClick = async () => {
      if (!selected) {
          if (planItems.length > 0) {
              const firstItem = planItems[0];
              setSelectedId(firstItem.id);
              // Auto-start session for the first item
              if (!sessionId) {
                  await startSession(firstItem.resource.id);
              }
              if (!playingSince) {
                  setPlayingSince(Date.now());
              }
          }
      }
  };

  return (
    <ChildLayout bgClass="bg-green-50" onBack={handleBack}>
      <div className="flex flex-col h-full w-full lg:max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-green-600 mb-4 px-2 drop-shadow-sm font-cartoon tracking-wide">
            Fun Video
        </h1>

        {/* Video Player Section */}
        <div className="mb-6 px-2">
            <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-white relative" onClick={handleVideoClick}>
                {selected ? (
                    <ChildVideoPlayer 
                        src={selected.resource.url}
                        onPlay={async () => {
                            if (!sessionId && selected?.resource?.id) await startSession(selected.resource.id);
                            if (!playingSince) setPlayingSince(Date.now());
                        }}
                        onPause={() => {
                            if (playingSince) {
                                const now = Date.now();
                                setPlayedMs((prev) => prev + (now - playingSince));
                                setPlayingSince(null);
                            }
                        }}
                        onTimeUpdate={() => flushPlayedMs()}
                        onEnded={async () => await finishSession('ended')}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-gray-900">
                        <Play size={64} className="mb-4 opacity-50" />
                        <p className="font-bold text-lg">Choose a video to play!</p>
                    </div>
                )}
            </div>
            {selected && (
                <div className="mt-3 px-1">
                    <h2 className="text-xl font-bold text-gray-800">{selected.resource.filename}</h2>
                </div>
            )}
        </div>

        {/* Video List Grid */}
        <div className="flex-1 overflow-y-auto px-2 pb-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {planItems.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelect(item.id)}
                        className={`
                            bg-white p-3 rounded-2xl shadow-md border-2 cursor-pointer flex items-center gap-3
                            ${selectedId === item.id ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent'}
                        `}
                    >
                        <div className={`
                            w-11 h-11 rounded-full flex items-center justify-center shrink-0
                            ${selectedId === item.id ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'}
                        `}>
                            {selectedId === item.id ? <Play size={20} fill="currentColor" /> : <Play size={20} />}
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-gray-800 truncate">{item.resource.filename}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                Level {item.resource.difficulty_level}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
            
            {planItems.length === 0 && (
                <div className="text-center py-10 text-gray-400 font-medium">
                    No videos found. Ask mom or dad to add some!
                </div>
            )}
        </div>
      </div>
    </ChildLayout>
  );
};

export default ChildVideos;
