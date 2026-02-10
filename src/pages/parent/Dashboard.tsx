import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from 'antd-mobile';
import { BookOpen, Settings, BarChart2, LogOut } from 'lucide-react';
import useStore from '@/store/useStore';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useStore((state: any) => state.user);
  const logout = useStore((state: any) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">
          {t('dashboard')}
        </h1>
        <Button size='small' color='danger' fill='none' onClick={handleLogout}>
          <LogOut size={20} />
        </Button>
      </div>

      <Card className="mb-4">
        <div className="flex items-center">
          <div className="bg-blue-100 rounded-full p-2 mr-4">
            <span className="text-xl">👋</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">{user?.username || 'Parent'}</h3>
            <p className="text-gray-500 text-sm">Let's manage learning!</p>
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
          onClick={() => {}} 
          className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center h-32 active:bg-gray-50 opacity-50"
        >
          <BarChart2 className="text-green-500 mb-2" size={32} />
          <span className="font-medium text-gray-700">{t('learning_report')}</span>
        </div>

        <div 
          onClick={() => {}} 
          className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center justify-center h-32 active:bg-gray-50 opacity-50"
        >
          <Settings className="text-orange-500 mb-2" size={32} />
          <span className="font-medium text-gray-700">{t('learning_settings')}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
