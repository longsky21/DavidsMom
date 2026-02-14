import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { ChevronDown, ChevronRight, Headphones, Star, Music } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';
import ChildLayout from '@/components/child/ChildLayout';
import ChildAudioPlayer from '@/components/child/ChildAudioPlayer';
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
const nameCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const ChildListening: React.FC = () => {
  const navigate = useNavigate();
  const childToken = useStore((s: UserState) => s.childToken);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${childToken}` }), [childToken]);

  const [planItems, setPlanItems] = useState<MediaPlanItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playedMs, setPlayedMs] = useState<number>(0);
  const [playingSince, setPlayingSince] = useState<number | null>(null);
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  const selected = useMemo(() => planItems.find((x) => x.id === selectedId) || null, [planItems, selectedId]);
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
        params: { module: 'audio' },
        headers: authHeaders,
      });
      const items = data as MediaPlanItem[];
      setPlanItems(items);
      // setSelectedId((prev) => prev ?? (items.length > 0 ? items[0].id : null));
    } catch {
      Toast.show({ content: '加载听力失败', icon: 'fail' });
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
    
    const durationSeconds = Math.max(0, Math.round(playedMs / 1000));
    
    try {
      await axios.post(
        `/api/media/session/${sessionId}/finish`,
        { 
            duration_seconds: durationSeconds, 
            completion_percent: 100, 
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
        { resource_id: resourceId, module: 'audio' },
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

  const handleNext = () => {
      if (!selectedId || flatItems.length === 0) return;
      const idx = flatItems.findIndex(i => i.id === selectedId);
      if (idx !== -1 && idx < flatItems.length - 1) {
          handleSelect(flatItems[idx + 1].id);
      }
  };

  const handlePrev = () => {
      if (!selectedId || flatItems.length === 0) return;
      const idx = flatItems.findIndex(i => i.id === selectedId);
      if (idx > 0) {
          handleSelect(flatItems[idx - 1].id);
      }
  };

  const handlePlayerClick = async () => {
      if (!selected) {
          if (flatItems.length > 0) {
              const firstItem = flatItems[0];
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
    <ChildLayout bgClass="bg-blue-50" onBack={handleBack}>
       <div className="flex flex-col h-full w-full lg:max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-blue-600 mb-4 px-2 drop-shadow-sm font-cartoon tracking-wide">
            Listening Practice
        </h1>

        {/* Player Section */}
        <div className="mb-6 px-2 sticky top-0 z-10" onClick={handlePlayerClick}>
            {selected ? (
                <ChildAudioPlayer 
                    src={selected.resource.url}
                    title={selected.resource.filename}
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
                    onNext={handleNext}
                    onPrev={handlePrev}
                />
            ) : (
                <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-blue-100 flex items-center justify-center min-h-[160px]">
                    <div className="text-center text-gray-400">
                        <Headphones size={48} className="mx-auto mb-2 opacity-50" />
                        <p className="font-bold">Select a song to start!</p>
                    </div>
                </div>
            )}
        </div>

        {/* Audio List */}
        <div className="flex-1 overflow-y-auto px-2 pb-24 space-y-5">
            {groupedItems.map((group) => (
                <div key={group.directory} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="text-sm font-bold text-gray-600">{group.directory}</div>
                        <button
                            type="button"
                            className="flex items-center gap-1 text-sm text-gray-500 px-1 py-0.5"
                            onClick={() => {
                                setHiddenGroups((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(group.directory)) next.delete(group.directory);
                                    else next.add(group.directory);
                                    return next;
                                });
                            }}
                        >
                            <span className="text-blue-600 font-bold">{group.items.length}</span>
                            {hiddenGroups.has(group.directory) ? (
                                <ChevronRight size={16} className="text-gray-400" />
                            ) : (
                                <ChevronDown size={16} className="text-gray-400" />
                            )}
                        </button>
                    </div>
                    {!hiddenGroups.has(group.directory) && (
                        <div className="grid gap-3">
                            {group.items.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSelect(item.id)}
                                    className={`
                                        bg-white p-3 rounded-2xl shadow-sm border-2 cursor-pointer flex items-center gap-3 transition-colors
                                        ${selectedId === item.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-blue-100'}
                                    `}
                                >
                                    <div className={`
                                        w-11 h-11 rounded-full flex items-center justify-center shrink-0
                                        ${selectedId === item.id ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-500'}
                                    `}>
                                        <Music size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`font-bold truncate ${selectedId === item.id ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {item.resource.filename}
                                        </div>
                                        <div className="text-xs text-gray-400 flex items-center gap-1">
                                            <Star size={10} className="text-yellow-400 fill-yellow-400" />
                                            Level {item.resource.difficulty_level}
                                        </div>
                                    </div>
                                    {selectedId === item.id && (
                                         <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {planItems.length === 0 && (
                <div className="text-center py-10 text-gray-400 font-medium">
                    No audio found.
                </div>
            )}
        </div>
      </div>
    </ChildLayout>
  );
};

export default ChildListening;
