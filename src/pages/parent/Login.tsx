import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Toast } from 'antd-mobile';
import axios from 'axios';
import useStore from '@/store/useStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const setToken = useStore((state: any) => state.setToken);
  const setUser = useStore((state: any) => state.setUser);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // In real app, use environment variable for API URL
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        phone: values.phone,
        password: values.password
      });
      
      const { access_token, user_id, user_name } = response.data;
      setToken(access_token);
      setUser({ id: user_id, name: user_name, phone: values.phone });
      
      Toast.show({
        icon: 'success',
        content: '登录成功',
      });
      navigate('/parent/dashboard');
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

  const handleRegisterMock = async () => {
    // Helper to register quickly for demo
    const phone = prompt("Enter phone to register:");
    const password = prompt("Enter password:");
    const name = prompt("Enter name:");
    if(phone && password && name) {
        try {
            await axios.post('http://localhost:8000/api/auth/register', {
                phone, password, name
            });
            Toast.show("Registered! Please login.");
        } catch(e) {
            alert("Registration failed");
        }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col justify-center">
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
            <Button fill='none' onClick={handleRegisterMock}>没有账号？点击注册 (Demo)</Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
