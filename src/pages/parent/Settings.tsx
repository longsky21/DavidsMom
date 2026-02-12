import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Form, Stepper, Button, Toast, Switch, Input, Card } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import useStore from '@/store/useStore';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = useStore((state: any) => state.token);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [autoDifficulty, setAutoDifficulty] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/learning/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      form.setFieldsValue(data);
      setAutoDifficulty(data.auto_adjust_difficulty);
    } catch (error) {
      console.error(error);
      Toast.show({ content: '加载设置失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await axios.put('/api/learning/settings', values, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ content: '保存成功', icon: 'success' });
    } catch (error) {
      console.error(error);
      Toast.show({ content: '保存设置失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar 
        onBack={() => navigate('/parent')}
        className="bg-white border-b sticky top-0 z-10 shadow-sm"
        style={{ '--height': '56px' }}
      >
        <span className="text-xl font-bold text-gray-800">学习设置</span>
      </NavBar>

      <div className="p-4">
        <Card className="rounded-xl shadow-sm border border-gray-100 bg-white overflow-hidden">
            <Form 
                form={form} 
                onFinish={onFinish}
                footer={
                <Button block type='submit' color='primary' size='large' loading={loading} className="mt-4">
                    保存设置
                </Button>
                }
                layout='horizontal'
                mode='card'
            >
                <Form.Header>学习计划</Form.Header>
                <Form.Item 
                    name="daily_words" 
                    label="每日学习量" 
                    extra="个单词"
                    rules={[{ required: true }]}
                >
                    <Stepper min={5} max={50} />
                </Form.Item>

                <Form.Item
                    name="daily_video_minutes"
                    label="每日视频时长"
                    extra="分钟"
                    rules={[{ required: true }]}
                >
                    <Stepper min={0} max={120} />
                </Form.Item>

                <Form.Item
                    name="daily_video_items"
                    label="每日视频个数"
                    extra="个"
                    rules={[{ required: true }]}
                >
                    <Stepper min={0} max={10} />
                </Form.Item>

                <Form.Item
                    name="daily_audio_minutes"
                    label="每日听力时长"
                    extra="分钟"
                    rules={[{ required: true }]}
                >
                    <Stepper min={0} max={120} />
                </Form.Item>

                <Form.Item
                    name="daily_audio_items"
                    label="每日听力个数"
                    extra="个"
                    rules={[{ required: true }]}
                >
                    <Stepper min={0} max={10} />
                </Form.Item>
                
                <Form.Item 
                    name="reminder_time" 
                    label="提醒时间"
                    rules={[{ required: true }]}
                >
                     <Input type="time" />
                </Form.Item>

                <Form.Header>难度设置</Form.Header>
                <Form.Item 
                    name="auto_adjust_difficulty" 
                    label="智能调节难度" 
                    childElementPosition='right'
                    help="根据孩子年龄自动调整单词难度"
                >
                    <Switch onChange={checked => setAutoDifficulty(checked)} />
                </Form.Item>

                <Form.Item
                    name="auto_upgrade_media_difficulty"
                    label="视频/听力自动升级"
                    childElementPosition='right'
                    help="根据完成情况自动升级难度（1-4）"
                >
                    <Switch />
                </Form.Item>

                {!autoDifficulty && (
                    <Form.Item 
                        name="difficulty_level" 
                        label="难度等级"
                        help="1 (简单) - 5 (困难)"
                    >
                        <Stepper min={1} max={5} />
                    </Form.Item>
                )}
            </Form>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
