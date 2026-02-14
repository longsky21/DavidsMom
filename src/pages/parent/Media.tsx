import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Tabs, Toast, Switch, Button, Card, Tag, InfiniteScroll, Collapse, SwipeAction } from 'antd-mobile';
import { Plus } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';

type MediaType = 'video' | 'audio';
type ParentMediaTab = 'video' | 'audio' | 'library';
const nameCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

interface MediaResource {
  id: string;
  directory?: string | null;
  filename: string;
  media_type: MediaType;
  size_mb?: number | null;
  duration_seconds?: number | null;
  url: string;
  source_channel: string;
  difficulty_level: number;
  location_type?: string | null;
  pair_key?: string | null;
}

interface MediaPlanItem {
  id: string;
  child_id: string;
  module: MediaType;
  is_enabled: boolean;
  is_deleted: boolean;
  order_index: number;
  resource: MediaResource;
}

type MediaPlanPatch = Partial<Pick<MediaPlanItem, 'is_enabled' | 'is_deleted'>>;

const ParentMedia: React.FC = () => {
  const navigate = useNavigate();
  const token = useStore((s: UserState) => s.token);

  const [activeTab, setActiveTab] = useState<ParentMediaTab>('video');

  const [videoPlan, setVideoPlan] = useState<MediaPlanItem[]>([]);
  const [audioPlan, setAudioPlan] = useState<MediaPlanItem[]>([]);

  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType>('video');
  const [difficulty, setDifficulty] = useState<number>(0);
  const [directoryOptions, setDirectoryOptions] = useState<string[]>([]);
  const [selectedDirectories, setSelectedDirectories] = useState<string[]>([]);
  const [resources, setResources] = useState<MediaResource[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const pageSize = 30;
  const prevMediaTypeRef = useRef<MediaType>(mediaTypeFilter);

  const formatLevel = (level: number) => `L${level}`;

  const fetchPlan = async (module: MediaType) => {
    setLoadingPlan(true);
    try {
      const { data } = await axios.get('/api/media/plan', {
        params: { module, include_deleted: false, include_disabled: true },
        headers: authHeaders,
      });
      if (module === 'video') setVideoPlan(data);
      else setAudioPlan(data);
    } catch {
      Toast.show({ content: '加载学习计划失败', icon: 'fail' });
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchDirectoryOptions = async (mediaType: MediaType) => {
    try {
      const { data } = await axios.get('/api/media/resources/directories', {
        params: { media_type: mediaType },
        headers: authHeaders,
      });
      setDirectoryOptions(Array.isArray(data) ? data : []);
    } catch {
      setDirectoryOptions([]);
    }
  };

  const fetchResourcesPage = async (nextOffset: number) => {
    setLoadingResources(true);
    try {
      const { data } = await axios.get('/api/media/resources', {
        params: {
          media_type: mediaTypeFilter,
          difficulty_level: difficulty === 0 ? undefined : difficulty,
          directories: selectedDirectories.length > 0 ? selectedDirectories.join(',') : undefined,
          limit: pageSize,
          offset: nextOffset,
        },
        headers: authHeaders,
      });

      const items: MediaResource[] = Array.isArray(data) ? data : [];
      if (nextOffset === 0) {
        setResources(items);
      } else {
        setResources((prev) => prev.concat(items));
      }

      const newOffset = nextOffset + items.length;
      setOffset(newOffset);
      setHasMore(items.length === pageSize);
    } catch {
      Toast.show({ content: '加载资源库失败', icon: 'fail' });
      setHasMore(false);
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    fetchPlan('video');
    fetchPlan('audio');
  }, []);

  useEffect(() => {
    if (activeTab !== 'library') return;

    if (prevMediaTypeRef.current !== mediaTypeFilter) {
      prevMediaTypeRef.current = mediaTypeFilter;
      setSelectedDirectories([]);
      fetchDirectoryOptions(mediaTypeFilter);
      return;
    }

    if (directoryOptions.length === 0) {
      fetchDirectoryOptions(mediaTypeFilter);
    }

    setOffset(0);
    setHasMore(true);
    fetchResourcesPage(0);
  }, [activeTab, mediaTypeFilter, difficulty, selectedDirectories]);

  const updatePlanItem = async (id: string, patch: MediaPlanPatch) => {
    await axios.patch(`/api/media/plan/${id}`, patch, { headers: authHeaders });
  };

  const handleToggleEnabled = async (item: MediaPlanItem) => {
    try {
      await updatePlanItem(item.id, { is_enabled: !item.is_enabled });
      await fetchPlan(item.module);
    } catch {
      Toast.show({ content: '更新失败', icon: 'fail' });
    }
  };

  const handleDelete = async (item: MediaPlanItem) => {
    try {
      await updatePlanItem(item.id, { is_deleted: true });
      await fetchPlan(item.module);
      Toast.show({ content: '已删除', icon: 'success' });
    } catch {
      Toast.show({ content: '删除失败', icon: 'fail' });
    }
  };

  const handleAddToPlan = async (resource: MediaResource, module: MediaType) => {
    try {
      await axios.post(
        '/api/media/plan/add',
        { resource_id: resource.id, module, sync_pair: false },
        { headers: authHeaders }
      );
      Toast.show({ content: '已加入学习计划', icon: 'success' });
      await fetchPlan(module);
      if (activeTab === 'library') {
        setOffset(0);
        setHasMore(true);
        await fetchResourcesPage(0);
      }
    } catch {
      Toast.show({ content: '加入失败', icon: 'fail' });
    }
  };

  const PlanList = ({ items }: { items: MediaPlanItem[] }) => {
    const grouped = useMemo(() => {
      const map = new Map<string, MediaPlanItem[]>();
      items.forEach((item) => {
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
    }, [items]);

    return (
      <div className="p-4 space-y-4">
      {items.length === 0 && (
        <Card className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4 text-gray-500 text-sm">暂未添加资源，可在“资源库”中选择</div>
        </Card>
      )}

      {items.length > 0 && (
        <Collapse defaultActiveKey={grouped.map((group) => group.directory)} accordion={false}>
          {grouped.map((group) => (
            <Collapse.Panel
              key={group.directory}
              title={
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="font-bold text-gray-700">{group.directory}</span>
                  <span className="text-xs text-gray-400">{group.items.length}</span>
                </div>
              }
            >
              <div className="space-y-3">
                {group.items.map((item) => (
                  <SwipeAction
                    key={item.id}
                    rightActions={[
                      {
                        key: 'delete',
                        text: '删除',
                        color: 'danger',
                        onClick: () => handleDelete(item),
                      },
                    ]}
                  >
                    <Card className="bg-white active:bg-gray-50 transition-all shadow-sm hover:shadow-md rounded-xl border border-gray-100 overflow-hidden">
                      <div className="p-4 flex gap-3 items-start">
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-gray-800 truncate tracking-tight">
                            {item.resource.filename}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            <Tag color="primary" fill="outline" className="rounded-md px-2">
                              {item.resource.media_type === 'video' ? '视频' : '音频'}
                            </Tag>
                            <Tag color="warning" fill="outline" className="rounded-md px-2">
                              {formatLevel(item.resource.difficulty_level)}
                            </Tag>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Switch checked={item.is_enabled} onChange={() => handleToggleEnabled(item)} />
                        </div>
                      </div>
                    </Card>
                  </SwipeAction>
                ))}
              </div>
            </Collapse.Panel>
          ))}
        </Collapse>
      )}
    </div>
    );
  };

  const Library = () => (
    <div className="p-4 space-y-3">
      <Card className="rounded-xl shadow-sm border border-gray-100 bg-white overflow-hidden">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">类型：</span>
            <Button
              size="small"
              color={mediaTypeFilter === 'video' ? 'primary' : 'default'}
              onClick={() => setMediaTypeFilter('video')}
            >
              视频
            </Button>
            <Button
              size="small"
              color={mediaTypeFilter === 'audio' ? 'primary' : 'default'}
              onClick={() => setMediaTypeFilter('audio')}
            >
              音频
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">难度：</span>
            <Button
                size="small"
                color={difficulty === 0 ? 'primary' : 'default'}
                onClick={() => setDifficulty(0)}
            >
                全部
            </Button>
            {[1, 2, 3, 4].map((level) => (
              <Button
                key={level}
                size="small"
                color={difficulty === level ? 'primary' : 'default'}
                onClick={() => setDifficulty(level)}
              >
                {formatLevel(level)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">目录：</span>
            <Button
              size="small"
              color={selectedDirectories.length === 0 ? 'primary' : 'default'}
              onClick={() => setSelectedDirectories([])}
            >
              全部
            </Button>
            {directoryOptions.map((dir) => {
              const selected = selectedDirectories.includes(dir);
              return (
                <Button
                  key={dir}
                  size="small"
                  color={selected ? 'primary' : 'default'}
                  onClick={() => {
                    setSelectedDirectories((prev) => {
                      if (prev.includes(dir)) return prev.filter((x) => x !== dir);
                      return prev.concat(dir);
                    });
                  }}
                >
                  {dir}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="rounded-xl shadow-sm border border-gray-100 bg-white overflow-hidden">
        {resources.length === 0 && <div className="p-4 text-gray-500 text-sm">没有匹配的资源</div>}

        {resources.map((r) => (
          <Card
            key={r.id}
            className="mx-4 mb-3 bg-white active:bg-gray-50 transition-all shadow-sm hover:shadow-md rounded-xl border border-gray-100 overflow-hidden"
          >
            <div className="p-4 flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-gray-800 truncate tracking-tight">{r.filename}</div>
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <Tag color="primary" fill="outline" className="rounded-md px-2">
                    {r.media_type === 'video' ? '视频' : '音频'}
                  </Tag>
                  <Tag color="warning" fill="outline" className="rounded-md px-2">
                    {formatLevel(r.difficulty_level)}
                  </Tag>
                  {r.directory && (
                    <Tag color="default" fill="outline" className="rounded-md px-2">
                      {r.directory}
                    </Tag>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="mini"
                  color="primary"
                  fill="none"
                  onClick={() => handleAddToPlan(r, r.media_type)}
                  aria-label="加入学习计划"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Plus size={18} className="text-blue-600" />
                  </div>
                </Button>
              </div>
            </div>
          </Card>
        ))}
        <div className="px-3 pb-3">
          <InfiniteScroll
            loadMore={async () => {
              if (loadingResources || !hasMore) return;
              await fetchResourcesPage(offset);
            }}
            hasMore={hasMore}
          />
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        onBack={() => navigate('/parent/dashboard')}
        className="bg-white border-b sticky top-0 z-10 shadow-sm"
        style={{ '--height': '56px' }}
      >
        <span className="text-xl font-bold text-gray-800">视频/听力管理</span>
      </NavBar>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as ParentMediaTab)}
        style={{ '--title-font-size': '16px' }}
      >
        <Tabs.Tab title="视频计划" key="video">
          <PlanList items={videoPlan} />
        </Tabs.Tab>
        <Tabs.Tab title="听力计划" key="audio">
          <PlanList items={audioPlan} />
        </Tabs.Tab>
        <Tabs.Tab title="资源库" key="library">
          <Library />
        </Tabs.Tab>
      </Tabs>

      {loadingPlan && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm">加载中…</div>
        </div>
      )}
    </div>
  );
};

export default ParentMedia;
