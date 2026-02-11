import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, NavBar } from 'antd-mobile';
import { BookOpen, Settings, BarChart2 } from 'lucide-react';
import useStore from '@/store/useStore';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useStore((state: any) => state.user);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar 
        onBack={() => navigate('/')}
        className="bg-white border-b sticky top-0 z-10 shadow-sm"
        style={{ '--height': '56px' }}
      >
        <span className="text-xl font-bold text-gray-800">{t('dashboard')}</span>
      </NavBar>

      <div className="p-4">
        <Card 
          className="mb-4 active:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => navigate('/parent/profile')}
        >
        <div className="flex items-center">
          <div className="bg-blue-100 rounded-full w-14 h-14 flex items-center justify-center mr-4 border-2 border-white shadow-sm overflow-hidden">
            {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                <span className="text-2xl">👋</span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">{user?.username || 'Parent'}</h3>
            <p className="text-blue-500 text-xs font-medium">Let's grow up together with our children!</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => navigate('/parent/words')}
          className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center h-32 active:bg-gray-50"
        >
          <BookOpen className="text-blue-500 mb-2" size={32} />
          <span className="font-medium text-gray-700">{t('word_library')}</span>
        </div>

        <div 
          onClick={() => navigate('/parent/report')} 
          className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center h-32 active:bg-gray-50"
        >
          <BarChart2 className="text-green-500 mb-2" size={32} />
          <span className="font-medium text-gray-700">{t('learning_report')}</span>
        </div>

        <div 
          onClick={() => navigate('/parent/settings')} 
          className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center h-32 active:bg-gray-50"
        >
          <Settings className="text-orange-500 mb-2" size={32} />
          <span className="font-medium text-gray-700">{t('learning_settings')}</span>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
