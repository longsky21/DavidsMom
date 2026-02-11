import React, { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useStore from '@/store/useStore';
import { Toast } from 'antd-mobile';

const AxiosInterceptor: React.FC = () => {
  const navigate = useNavigate();
  const logout = useStore((state: any) => state.logout);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Token expired or invalid
          logout();
          Toast.show({
            content: '登录已过期，请重新登录',
            icon: 'fail'
          });
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate, logout]);

  return null;
};

export default AxiosInterceptor;
