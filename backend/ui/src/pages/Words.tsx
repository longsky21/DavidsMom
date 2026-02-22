import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Search, Filter, Upload, Image as ImageIcon, Volume2, Save, X } from 'lucide-react';

interface Word {
  vc_id: string;
  word: string;
  translation: string;
  image_url?: string;
  audio_uk_url?: string;
  audio_us_url?: string;
  vc_difficulty?: number;
  word_from?: string;
}

import { Pagination } from '../components/ui/Pagination';

export default function Words() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    q: '',
    missing_image: '',
    word_from: '',
    difficulty: ''
  });
  
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  const fetchWords = () => {
    setLoading(true);
    api.get('/words/', { 
      params: { 
        page, 
        page_size: 20,
        ...filters,
        difficulty: filters.difficulty ? parseInt(filters.difficulty) : undefined
      } 
    })
    .then(res => {
      setWords(res.data.items);
      setTotal(res.data.total);
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWords();
  }, [page, filters]);

  const handleFileUpload = async (vc_id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/words/${vc_id}/upload_image`, formData);
      fetchWords(); // Refresh
    } catch (e) {
      alert('Upload failed');
    }
  };

  const handleSave = async (word: Word) => {
      try {
          await api.put(`/words/${word.vc_id}`, word);
          setEditingWord(null);
          fetchWords();
      } catch (e) {
          alert('Save failed');
      }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索单词..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.q}
              onChange={e => setFilters({...filters, q: e.target.value})}
            />
          </div>
          
          <select 
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white"
            value={filters.missing_image}
            onChange={e => setFilters({...filters, missing_image: e.target.value})}
          >
            <option value="">全部图片状态</option>
            <option value="missing">缺失图片</option>
            <option value="present">已有图片</option>
          </select>
          
          <select 
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white"
            value={filters.difficulty}
            onChange={e => setFilters({...filters, difficulty: e.target.value})}
          >
             <option value="">全部分级</option>
             {[1,2,3,4,5].map(l => <option key={l} value={l}>等级 {l}</option>)}
          </select>
        </div>
        
        <div className="text-sm text-slate-500">
            总计: <span className="font-bold text-slate-900">{total}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">单词</th>
              <th className="px-6 py-4">图片</th>
              <th className="px-6 py-4">翻译</th>
              <th className="px-6 py-4">等级</th>
              <th className="px-6 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {words.map(word => (
              <tr key={word.vc_id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-medium text-slate-900">{word.word}</td>
                <td className="px-6 py-4">
                  {word.image_url ? (
                    <img src={word.image_url} alt={word.word} className="w-12 h-12 object-cover rounded bg-slate-100" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 max-w-xs truncate" title={word.translation}>{word.translation}</td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded text-xs font-bold 
                     ${word.vc_difficulty === 1 ? 'bg-green-100 text-green-700' : 
                       word.vc_difficulty === 2 ? 'bg-blue-100 text-blue-700' :
                       word.vc_difficulty === 3 ? 'bg-yellow-100 text-yellow-700' :
                       'bg-red-100 text-red-700'
                     }`}>
                     Lv.{word.vc_difficulty}
                   </span>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {editingWord?.vc_id === word.vc_id ? (
                            <>
                                <button onClick={() => handleSave(editingWord)} className="p-1 hover:text-green-600"><Save size={18}/></button>
                                <button onClick={() => setEditingWord(null)} className="p-1 hover:text-red-600"><X size={18}/></button>
                            </>
                        ) : (
                            <button onClick={() => setEditingWord(word)} className="text-blue-600 hover:underline">编辑</button>
                        )}
                        
                        <label className="cursor-pointer text-slate-400 hover:text-blue-600" title="上传图片">
                            <Upload size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(word.vc_id, e.target.files[0])} />
                        </label>
                    </div>
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
      
      {/* Edit Modal (Optional, using inline edit for now or a simple overlay if needed, but simplified to inline state above for now. 
          Actually the above inline logic only toggles buttons. Let's make a real edit logic if we have time. 
          For now, assume simple row actions.) 
      */}
      {editingWord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                  <h3 className="text-lg font-bold mb-4">编辑单词: {editingWord.word}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">翻译</label>
                          <textarea 
                            className="w-full border rounded p-2" 
                            value={editingWord.translation || ''} 
                            onChange={e => setEditingWord({...editingWord, translation: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">难度等级</label>
                          <input 
                            type="number" 
                            className="w-full border rounded p-2" 
                            value={editingWord.vc_difficulty || 1} 
                            onChange={e => setEditingWord({...editingWord, vc_difficulty: parseInt(e.target.value)})}
                          />
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setEditingWord(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">取消</button>
                      <button onClick={() => handleSave(editingWord)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
