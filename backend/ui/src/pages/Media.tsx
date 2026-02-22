import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Search, FolderOpen, Play, FileVideo, FileAudio, RefreshCw, Upload, FileText, Wand2 } from 'lucide-react';

interface MediaResource {
  id: string;
  filename: string;
  directory: string;
  media_type: string;
  url: string;
  difficulty_level: number;
  srt_file?: string;
}

import { Pagination } from '../components/ui/Pagination';

export default function Media() {
  const { type } = useParams<{ type: string }>(); // video | audio
  const mediaType = type || 'video';
  
  const [resources, setResources] = useState<MediaResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [directories, setDirectories] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    q: '',
    directory: ''
  });
  
  // Batch Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importDir, setImportDir] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  // SRT Generation State
  const [generatingSrtId, setGeneratingSrtId] = useState<string | null>(null);
  
  // Video Modal State
  const [playingVideo, setPlayingVideo] = useState<MediaResource | null>(null);

  const fetchMedia = () => {
    setLoading(true);
    api.get('/media/', {
      params: {
        page,
        page_size: 20,
        media_type: mediaType,
        ...filters
      }
    })
    .then(res => {
      setResources(res.data.items);
      setTotal(res.data.total);
    })
    .finally(() => setLoading(false));
  };

  const fetchDirectories = () => {
    api.get('/media/directories', { params: { media_type: mediaType } })
      .then(res => setDirectories(res.data));
  };

  useEffect(() => {
    setPage(1);
    setFilters({ q: '', directory: '' });
    fetchDirectories();
  }, [mediaType]);

  useEffect(() => {
    fetchMedia();
  }, [page, filters, mediaType]);

  const handleBatchImport = async () => {
      setIsImporting(true);
      try {
          const res = await api.post('/media/batch_import', {
              directory: importDir,
              media_type: mediaType
          });
          setImportResult(res.data);
          fetchMedia();
          fetchDirectories();
      } catch (e: any) {
          alert('Import failed: ' + (e.response?.data?.detail || e.message));
      } finally {
          setIsImporting(false);
      }
  };

  const handleUploadSrt = async (mediaId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
        await api.post(`/media/${mediaId}/upload_srt`, formData);
        fetchMedia(); // Refresh to show SRT status
        alert('SRT uploaded successfully');
    } catch (e: any) {
        alert('Upload failed: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleGenerateSrt = async (mediaId: string) => {
      if (!confirm('Generating SRT may take a while. Continue?')) return;
      setGeneratingSrtId(mediaId);
      try {
          await api.post(`/media/${mediaId}/generate_srt`);
          alert('SRT generation started in background. Please refresh later.');
      } catch (e: any) {
          alert('Generation failed: ' + (e.response?.data?.detail || e.message));
      } finally {
          setGeneratingSrtId(null);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold capitalize">{mediaType === 'video' ? '视频' : '音频'}库</h2>
         <button 
           onClick={() => setImportDir('/Users/longsky/Documents/trae_projects/DavidsMom/public/static/audio')} // Default suggestion
           className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2"
           title="打开批量导入"
         >
             <RefreshCw size={18} /> 批量导入
         </button>
      </div>

      {/* Import Panel */}
      {importDir && (
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold mb-2">批量导入 {mediaType === 'video' ? '视频' : '音频'} (从服务器目录)</h3>
              <div className="flex gap-4">
                  <input 
                    type="text" 
                    className="flex-1 px-4 py-2 rounded border border-slate-300"
                    placeholder="/absolute/path/to/media"
                    value={importDir}
                    onChange={e => setImportDir(e.target.value)}
                  />
                  <button 
                    onClick={handleBatchImport}
                    disabled={isImporting}
                    className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                      {isImporting ? '扫描中...' : '扫描并导入'}
                  </button>
                  <button onClick={() => { setImportDir(''); setImportResult(null); }} className="px-4 py-2 text-slate-500">关闭</button>
              </div>
              {importResult && (
                  <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                      {importResult.message}
                  </div>
              )}
          </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索文件名..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.q}
              onChange={e => setFilters({...filters, q: e.target.value})}
            />
          </div>
          
          <select 
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white max-w-xs truncate"
            value={filters.directory}
            onChange={e => setFilters({...filters, directory: e.target.value})}
          >
            <option value="">所有目录</option>
            {directories.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
                总计: <span className="font-bold text-slate-900">{total}</span>
            </div>
            <button onClick={fetchMedia} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500" title="刷新">
                <RefreshCw size={18} />
            </button>
        </div>
      </div>

      {/* Grid / List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">文件名</th>
              <th className="px-6 py-4">目录</th>
              <th className="px-6 py-4">SRT字幕</th>
              <th className="px-6 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map(res => (
              <tr key={res.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    {mediaType === 'video' ? <FileVideo size={16} className="text-blue-500"/> : <FileAudio size={16} className="text-pink-500"/>}
                    <span title={res.filename} className="truncate max-w-xs">{res.filename}</span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                    <div className="flex items-center gap-1">
                        <FolderOpen size={14} />
                        <span className="truncate max-w-[150px]" title={res.directory}>{res.directory}</span>
                    </div>
                </td>
                <td className="px-6 py-4">
                    {generatingSrtId === res.id ? (
                        <span className="text-purple-600 text-xs animate-pulse flex items-center gap-1">
                            <Wand2 size={12} className="animate-spin" /> 生成中...
                        </span>
                    ) : res.srt_file ? (
                        <a href={res.srt_file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
                            <FileText size={12} /> 已关联
                        </a>
                    ) : (
                        <span className="text-slate-400 text-xs">未关联</span>
                    )}
                </td>
                <td className="px-6 py-4 flex items-center gap-3">
                    <button 
                        onClick={() => {
                             if (mediaType === 'video') {
                                 // Use stream URL if it's a local file
                                 const streamUrl = res.url.startsWith('file://') 
                                    ? `/api/media/${res.id}/stream` 
                                    : res.url;
                                 setPlayingVideo({ ...res, url: streamUrl });
                             } else {
                                 window.open(res.url, '_blank');
                             }
                        }}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                        <Play size={14} />
                    </button>
                    
                    <label className="cursor-pointer text-slate-400 hover:text-blue-600" title="上传SRT">
                        <Upload size={18} />
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".srt" 
                            onChange={e => e.target.files?.[0] && handleUploadSrt(res.id, e.target.files[0])} 
                        />
                    </label>

                    <button 
                        onClick={() => handleGenerateSrt(res.id)} 
                        disabled={generatingSrtId === res.id}
                        className={`text-slate-400 hover:text-purple-600 ${generatingSrtId === res.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={generatingSrtId === res.id ? "生成中..." : "AI生成字幕"}
                    >
                        <Wand2 size={18} className={generatingSrtId === res.id ? "animate-spin" : ""} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
         {/* Pagination */}
        <Pagination 
            page={page} 
            total={total} 
            pageSize={20} 
            onChange={setPage} 
        />
      </div>
    </div>
  );
}
