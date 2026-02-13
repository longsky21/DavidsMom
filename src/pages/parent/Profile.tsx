import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Form, Input, Button, Toast, Card } from 'antd-mobile';
import { Camera, User } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';

interface ProfileResponse {
  parent: { username: string; avatar_url?: string | null };
  child: { nickname: string; age?: number | null; avatar_url?: string | null };
}

interface UpdateProfileResponse {
  user_id: string;
  username: string;
}

interface UploadResponse {
  url: string;
}

interface ProfileFormValues {
  parent_username: string;
  child_nickname: string;
  child_age?: string | number;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const token = useStore((state: UserState) => state.token);
  const setUser = useStore((state: UserState) => state.setUser);
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [parentAvatar, setParentAvatar] = useState<string>('');
  const [childAvatar, setChildAvatar] = useState<string>('');

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data as ProfileResponse;
      
      form.setFieldsValue({
        parent_username: data.parent.username,
        child_nickname: data.child.nickname,
        child_age: data.child.age
      });
      
      setParentAvatar(data.parent.avatar_url || '');
      setChildAvatar(data.child.avatar_url || '');
    } catch (error) {
      console.error(error);
      Toast.show({ content: '加载失败', icon: 'fail' });
    } finally {
      setInitialLoading(false);
    }
  }, [form, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'parent' | 'child') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        Toast.show({ content: 'Please upload an image file', icon: 'fail' });
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const loadingToast = Toast.show({ content: 'Uploading...', icon: 'loading', duration: 0 });
        const response = await axios.post('/api/auth/upload', formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        loadingToast.close();
        
        // Use full URL (relative to current origin, which is proxying to backend or backend directly)
        // Since backend returns /uploads/filename, and we have proxy set up or backend serves static
        // We might need to ensure axios base URL + url works.
        // Assuming /api proxy works, but static files might need careful handling.
        // In vite proxy: /api -> http://localhost:8000/api
        // We need to access http://localhost:8000/uploads/...
        // Let's assume axios baseURL is set to empty or proxy handles /api
        // If we want to access /uploads, we might need a proxy for that too or use full URL.
        
        // For simple dev, let's assume backend is on same host/port via proxy
        // OR we use absolute URL if we knew backend URL.
        // Since backend returns `/uploads/...`, and we mounted `/uploads` in FastAPI app.
        // We need to make sure frontend can reach `/uploads`.
        
        const uploadedUrl = (response.data as UploadResponse).url;
        if (type === 'parent') setParentAvatar(uploadedUrl);
        else setChildAvatar(uploadedUrl);
        
        Toast.show({ content: 'Upload success', icon: 'success' });

    } catch (error) {
        console.error(error);
        Toast.show({ content: 'Upload failed', icon: 'fail' });
    }
  };

  const onFinish = async (values: ProfileFormValues) => {
    try {
      setLoading(true);
      const payload = {
        ...values,
        parent_avatar_url: parentAvatar,
        child_avatar_url: childAvatar
      };
      
      const response = await axios.put('/api/auth/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local store with new user info (at least what we have)
      const newTokenData = response.data as UpdateProfileResponse;
      // We might need to refresh the whole user object or just update parts. 
      // The login response structure is what we usually store.
      // Let's rely on the response from update_profile which returns a Token structure with user info
      setUser({
          id: newTokenData.user_id,
          username: newTokenData.username,
          avatar_url: parentAvatar // We know we just updated it
      });

      Toast.show({ content: '保存成功', icon: 'success' });
      navigate('/parent/dashboard');
    } catch (error) {
      console.error(error);
      Toast.show({ content: '保存失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="p-4 text-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar 
        onBack={() => navigate('/parent/dashboard')}
        className="bg-white border-b sticky top-0 z-10 shadow-sm"
        style={{ '--height': '56px' }}
      >
        <span className="text-xl font-bold text-gray-800">个人资料</span>
      </NavBar>

      <div className="p-4">
        <Form 
            form={form} 
            onFinish={onFinish}
            footer={
            <Button block type='submit' color='primary' size='large' loading={loading} className="mt-6">
                保存修改
            </Button>
            }
            layout='vertical'
            mode='card'
            className="bg-transparent shadow-none border-none"
        >
            <Card className="mb-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">家长信息</div>
                
                <div className="flex justify-center mb-6">
                    <div className="relative cursor-pointer group">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                            onChange={(e) => handleAvatarUpload(e, 'parent')}
                        />
                        <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-md">
                            {parentAvatar ? (
                                <img src={parentAvatar} alt="Parent Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <User size={40} />
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full shadow-sm border-2 border-white">
                            <Camera size={16} />
                        </div>
                    </div>
                </div>

                <Form.Item 
                    name="parent_username" 
                    label="用户名"
                    rules={[{ required: true }]}
                >
                    <Input placeholder="请输入用户名" />
                </Form.Item>
            </Card>

            <Card className="mb-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">孩子信息</div>
                
                <div className="flex justify-center mb-6">
                    <div className="relative cursor-pointer group">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                            onChange={(e) => handleAvatarUpload(e, 'child')}
                        />
                        <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-md">
                            {childAvatar ? (
                                <img src={childAvatar} alt="Child Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <span className="text-2xl">👶</span>
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1.5 rounded-full shadow-sm border-2 border-white">
                            <Camera size={14} />
                        </div>
                    </div>
                </div>

                <Form.Item 
                    name="child_nickname" 
                    label="昵称"
                    rules={[{ required: true }]}
                >
                    <Input placeholder="请输入孩子昵称" />
                </Form.Item>

                <Form.Item 
                    name="child_age" 
                    label="年龄"
                >
                    <Input type="number" placeholder="请输入孩子年龄" />
                </Form.Item>
            </Card>
        </Form>
      </div>
    </div>
  );
};

export default Profile;
