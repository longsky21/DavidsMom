import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Toast } from 'antd-mobile';
import axios from 'axios';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';

interface LoginFormValues {
  phone: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  user_id: string;
  username: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const setToken = useStore((state: UserState) => state.setToken);
  const setUser = useStore((state: UserState) => state.setUser);
  const token = useStore((state: UserState) => state.token);

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      // In real app, use environment variable for API URL
      const response = await axios.post('/api/auth/login', {
        phone: values.phone,
        password: values.password
      });
      
      const { access_token, user_id, username } = response.data as LoginResponse;
      setToken(access_token);
      setUser({ id: user_id, username: username, phone: values.phone });
      
      Toast.show({
        icon: 'success',
        content: '登录成功',
      });
      navigate('/');
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: '登录失败，请检查手机号或密码',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col justify-center">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">David's Mom</h1>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6">{t('login')}</h2>
          <Form
            layout='horizontal'
            footer={
              <Button block type='submit' color='primary' size='large' loading={loading}>
                {t('submit')}
              </Button>
            }
            onFinish={onFinish}
          >
            <Form.Item
              name='phone'
              label={t('phone')}
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input placeholder='请输入手机号' />
            </Form.Item>
            <Form.Item
              name='password'
              label={t('password')}
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input type='password' placeholder='请输入密码' />
            </Form.Item>
          </Form>
          <div className="mt-4 text-center">
            <Button fill='none' onClick={() => navigate('/register')}>
              {t('no_account')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
