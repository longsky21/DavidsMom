import { LayoutDashboard, BookOpen, Video, Music, Settings, Menu } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: '仪表盘', end: true },
    { to: '/words', icon: BookOpen, label: '单词管理' },
    { to: '/media/video', icon: Video, label: '视频管理' },
    { to: '/media/audio', icon: Music, label: '音频管理' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside 
        className={`bg-slate-900 text-white transition-all duration-300 flex flex-col fixed inset-y-0 left-0 z-20 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
          <span className={`font-bold text-xl ${!isSidebarOpen && 'hidden'}`}>DavidsMom 后台</span>
          {!isSidebarOpen && <span className="font-bold text-xl">DM</span>}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              {isSidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white w-full"
          >
            <Menu size={20} />
            {isSidebarOpen && <span>收起</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 transition-all duration-300 min-h-screen flex flex-col ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 px-8 flex items-center justify-between shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">
            {/* Simple breadcrumb or title could go here */}
            管理控制台
          </h1>
          <div className="flex items-center gap-4">
             {/* User profile or actions */}
             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
               A
             </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
