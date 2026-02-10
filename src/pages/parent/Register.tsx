import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Toast } from 'antd-mobile';
import axios from 'axios';
import useStore from '@/store/useStore';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const setToken = useStore((state: any) => state.setToken);
  const setUser = useStore((state: any) => state.setUser);
  const token = useStore((state: any) => state.token);

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const onFinish = async (values: any) => {
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
      
      const { access_token, user_id, username } = response.data;
      setToken(access_token);
      setUser({ id: user_id, username: username, phone: values.phone });
      
      Toast.show({
        icon: 'success',
        content: t('register_success'),
      });
      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Registration failed';
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
  );
};

export default Register;
