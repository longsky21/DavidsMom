import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import { User, Baby, LogOut, Power } from 'lucide-react';
import useStore from '@/store/useStore';
import axios from 'axios';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const logout = useStore((state: any) => state.logout);
  const token = useStore((state: any) => state.token);
  const setChildToken = useStore((state: any) => state.setChildToken);
  const user = useStore((state: any) => state.user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const enterChildMode = async () => {
    try {
      const { data } = await axios.post(
        '/api/auth/child-token',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChildToken(data.access_token);
      navigate('/child');
    } catch (e) {
      Toast.show({ content: '进入儿童模式失败，请重试', icon: 'fail' });
    }
  };

  const enterParentMode = () => {
    setChildToken(null);
    navigate('/parent/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-orange-50 p-4 relative">
      <div className="absolute top-4 right-4">
          <div 
            onClick={handleLogout} 
            className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm cursor-pointer hover:bg-white transition-all transform hover:scale-105"
            title="Logout"
          >
            <Power size={20} className="text-blue-400" />
          </div>
      </div>

      <h1 className="text-4xl font-bold text-blue-600 mb-2">David's Mom</h1>
      <p className="text-gray-500 mb-10">Welcome, {user?.username || 'Parent'}</p>
      
      <div className="grid gap-6 w-full max-w-sm">
        <div 
          onClick={enterChildMode}
          className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center cursor-pointer transform transition duration-300 hover:scale-105 active:scale-95 hover:shadow-2xl ring-4 ring-white/50"
        >
          <div className="mb-4 relative">
            <div className="absolute inset-0 bg-orange-200 rounded-full blur-xl opacity-30"></div>
            <img 
                src="/assets/child_avatar.png?v=cool" 
                alt="Child" 
                className="w-32 h-32 rounded-full object-cover border-4 border-orange-100 shadow-md relative z-10" 
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">{t('child_mode')}</h2>
          <p className="text-gray-500 font-medium mt-1">Let's learn English!</p>
        </div>

        <div 
          onClick={enterParentMode}
          className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center cursor-pointer transform transition duration-300 hover:scale-105 active:scale-95 hover:shadow-2xl ring-4 ring-white/50"
        >
          <div className="mb-4 relative">
             <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-30"></div>
            <img 
                src="/assets/mom_avatar.png" 
                alt="Parent" 
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-md relative z-10" 
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">{t('parent_mode')}</h2>
          <p className="text-gray-500 font-medium mt-1">Manage words & progress</p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
