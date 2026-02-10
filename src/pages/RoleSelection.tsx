import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd-mobile';
import { User, Baby } from 'lucide-react';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-orange-50 p-4">
      <h1 className="text-4xl font-bold text-blue-600 mb-12">David's Mom</h1>
      
      <div className="grid gap-6 w-full max-w-md">
        <div 
          onClick={() => navigate('/child')}
          className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center cursor-pointer transform transition hover:scale-105 active:scale-95"
        >
          <div className="bg-orange-100 p-4 rounded-full mb-4">
            <Baby size={64} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{t('child_mode')}</h2>
          <p className="text-gray-500 mt-2">Let's learn English!</p>
        </div>

        <div 
          onClick={() => navigate('/parent/login')}
          className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center cursor-pointer transform transition hover:scale-105 active:scale-95"
        >
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <User size={64} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{t('parent_mode')}</h2>
          <p className="text-gray-500 mt-2">Manage words & progress</p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
