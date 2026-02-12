import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, List, Toast, Card, Tag, Button } from 'antd-mobile';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';

const ChildVideos: React.FC = () => {
  const navigate = useNavigate();
  const childToken = useStore((s: any) => s.childToken);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${childToken}` }), [childToken]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playedMs, setPlayedMs] = useState<number>(0);
  const [playingSince, setPlayingSince] = useState<number | null>(null);

  const selected = useMemo(() => planItems.find((x) => x.id === selectedId) || null, [planItems, selectedId]);

  const fetchPlan = async () => {
    try {
      const { data } = await axios.get('/api/media/child/plan', {
        params: { module: 'video' },
        headers: authHeaders,
      });
      setPlanItems(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
    } catch (e) {
      Toast.show({ content: '加载视频失败', icon: 'fail' });
    }
  };

  useEffect(() => {
    fetchPlan();
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
    const el = videoRef.current;
    const duration = el?.duration || 0;
    const currentTime = el?.currentTime || 0;
    const completionPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const durationSeconds = Math.max(0, Math.round(playedMs / 1000));
    const completedCount = completionPercent >= 95 ? 1 : 0;

    try {
      await axios.post(
        `/api/media/session/${sessionId}/finish`,
        { duration_seconds: durationSeconds, completion_percent: completionPercent, completed_count: completedCount },
        { headers: authHeaders }
      );
    } catch (e) {
      if (reason !== 'leave') Toast.show({ content: '保存学习记录失败', icon: 'fail' });
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
      setSessionId(data.id);
      setPlayedMs(0);
      setPlayingSince(Date.now());
    } catch (e) {
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

  return (
    <div className="min-h-screen bg-blue-50">
      <NavBar
        backArrow={<ArrowLeft className="text-blue-600" size={24} />}
        onBack={handleBack}
        className="bg-white border-b sticky top-0 z-10 shadow-sm"
      >
        <span className="text-xl font-bold text-blue-600 font-cartoon">Fun Videos</span>
      </NavBar>

      <div className="p-4 space-y-4">
        <Card className="rounded-2xl shadow-md border border-blue-100 bg-white overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-gray-800">Now Playing</div>
              <Button
                size="small"
                color="primary"
                disabled={!selected?.resource?.id || !!sessionId}
                onClick={() => startSession(selected.resource.id)}
              >
                开始计时
              </Button>
            </div>

            {selected ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Tag color="primary" fill="outline">
                    难度 {selected.resource.difficulty_level}
                  </Tag>
                  {selected.resource.directory && (
                    <Tag color="default" fill="outline">
                      {selected.resource.directory}
                    </Tag>
                  )}
                </div>
                <div className="font-medium text-gray-800">{selected.resource.filename}</div>
                <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
                  <video
                    ref={videoRef}
                    src={selected.resource.url}
                    controls
                    className="w-full h-full"
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
                    onTimeUpdate={() => {
                      flushPlayedMs();
                    }}
                    onEnded={async () => {
                      await finishSession('ended');
                    }}
                  />
                </div>
                {sessionId && (
                  <div className="text-xs text-gray-500">
                    已记录学习时长：{Math.max(0, Math.round(playedMs / 60000))} 分钟
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 text-sm">暂无可用视频，请让家长先在“视频/听力管理”中添加</div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl shadow-md border border-blue-100 bg-white overflow-hidden">
          <List header="Your Video List">
            {planItems.length === 0 && (
              <List.Item>
                <span className="text-gray-500 text-sm">暂无视频</span>
              </List.Item>
            )}
            {planItems.map((item) => (
              <List.Item
                key={item.id}
                clickable
                onClick={() => handleSelect(item.id)}
                extra={
                  item.id === selectedId ? (
                    <Tag color="success">播放中</Tag>
                  ) : (
                    <Tag color="default" fill="outline">
                      选择
                    </Tag>
                  )
                }
              >
                <div className="font-medium text-gray-800">{item.resource.filename}</div>
              </List.Item>
            ))}
          </List>
        </Card>
      </div>
    </div>
  );
};

export default ChildVideos;
