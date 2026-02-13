import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Toast } from 'antd-mobile';
import axios from 'axios';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';

interface RegisterFormValues {
  phone: string;
  username: string;
  child_nickname: string;
  password: string;
  confirm_password: string;
}

interface RegisterResponse {
  access_token: string;
  user_id: string;
  username: string;
}

interface ApiErrorBody {
  detail?: string;
}

const Register: React.FC = () => {
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

  const onFinish = async (values: RegisterFormValues) => {
    if (values.password !== values.confirm_password) {
      Toast.show({
        icon: 'fail',
        content: t('passwords_not_match'),
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/register', {
        phone: values.phone,
        username: values.username,
        password: values.password,
        child_nickname: values.child_nickname
      });
      
      const { access_token, user_id, username } = response.data as RegisterResponse;
      setToken(access_token);
      setUser({ id: user_id, username: username, phone: values.phone });
      
      Toast.show({
        icon: 'success',
        content: t('register_success'),
      });
      navigate('/');
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? ((error.response?.data as ApiErrorBody | undefined)?.detail ?? 'Registration failed')
        : 'Registration failed';
      Toast.show({
        icon: 'fail',
        content: msg,
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
          <h2 className="text-2xl font-bold text-center mb-6">{t('register')}</h2>
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
              rules={[{ required: true, message: t('phone') + ' is required' }]}
            >
              <Input placeholder={t('phone')} />
            </Form.Item>
            
            <Form.Item
              name='username'
              label={t('username')}
              rules={[{ required: true, message: t('username') + ' is required' }]}
            >
              <Input placeholder={t('username')} />
            </Form.Item>

            <Form.Item
              name='child_nickname'
              label={t('child_english_name')}
              rules={[{ required: true, message: t('child_english_name') + ' is required' }]}
            >
              <Input placeholder={t('child_english_name')} />
            </Form.Item>

            <Form.Item
              name='password'
              label={t('password')}
              rules={[{ required: true, message: t('password') + ' is required' }]}
            >
              <Input type='password' placeholder={t('password')} />
            </Form.Item>

            <Form.Item
              name='confirm_password'
              label={t('confirm_password')}
              rules={[{ required: true, message: t('confirm_password') + ' is required' }]}
            >
              <Input type='password' placeholder={t('confirm_password')} />
            </Form.Item>
          </Form>
          <div className="mt-4 text-center">
            <Button fill='none' onClick={() => navigate('/login')}>
              {t('has_account')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
