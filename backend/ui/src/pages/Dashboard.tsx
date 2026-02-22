import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Loader2, HardDrive, Globe, ImageOff, Video, Music, Database } from 'lucide-react';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div>加载数据失败</div>;

  const { stats, charts } = data;

  const wordImageChart = charts.word_image.labels.map((label: string, i: number) => ({
    name: label,
    value: charts.word_image.values[i]
  }));

  const mediaTypeChart = charts.media_type.labels.map((label: string, i: number) => ({
    name: label,
    value: charts.media_type.values[i]
  }));

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Database} label="词汇总数" value={stats.total_words} color="bg-blue-500" />
        <StatCard icon={ImageOff} label="缺失图片" value={stats.no_image_words} color="bg-red-500" subValue={`${(100 - stats.image_coverage).toFixed(1)}%`} />
        <StatCard icon={Video} label="视频总数" value={stats.total_video} color="bg-purple-500" />
        <StatCard icon={Music} label="音频总数" value={stats.total_audio} color="bg-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Word Image Coverage */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4">单词图片覆盖率</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wordImageChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {wordImageChart.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Media Type Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4">媒体资源分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mediaTypeChart}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {mediaTypeChart.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index + 2]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Top Directories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold mb-4">热门视频目录</h3>
             <ul className="space-y-3">
                 {charts.video_dir.labels.map((label: string, i: number) => (
                     <li key={i} className="flex justify-between items-center text-sm">
                         <span className="text-slate-600 truncate max-w-[70%]">{label}</span>
                         <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded">{charts.video_dir.values[i]}</span>
                     </li>
                 ))}
             </ul>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold mb-4">热门音频目录</h3>
             <ul className="space-y-3">
                 {charts.audio_dir.labels.map((label: string, i: number) => (
                     <li key={i} className="flex justify-between items-center text-sm">
                         <span className="text-slate-600 truncate max-w-[70%]">{label}</span>
                         <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded">{charts.audio_dir.values[i]}</span>
                     </li>
                 ))}
             </ul>
         </div>
      </div>

    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, subValue }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`p-4 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={24} className={`text-${color.replace('bg-', '')}`} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            {subValue && <span className="text-xs text-slate-400 font-mono">{subValue}</span>}
        </div>
      </div>
    </div>
  );
}
