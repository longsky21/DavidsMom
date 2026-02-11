import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Card, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';
import dayjs from 'dayjs';
import InsCalendar from '@/components/InsCalendar';

const Report: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = useStore((state: any) => state.token);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [historyDates, setHistoryDates] = useState<Set<string>>(new Set());
  const [dayDetail, setDayDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load history dates (to mark on calendar)
  useEffect(() => {
    const fetchHistoryDates = async () => {
      try {
        const response = await axios.get('/api/learning/history/dates', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dates = new Set<string>(response.data.map((item: any) => item.date));
        setHistoryDates(dates);
      } catch (error) {
        console.error("Failed to load history dates", error);
      }
    };
    fetchHistoryDates();
  }, [token]);

  // Load detail when date changes
  useEffect(() => {
    const fetchDayDetail = async () => {
      const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
      // Only fetch if this date is in history or it's today (user might want to check today even if empty yet)
      // Actually, better to just try fetching. If 404, we show empty state.
      
      setLoading(true);
      setDayDetail(null);
      try {
        const response = await axios.get(`/api/learning/history/${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDayDetail(response.data);
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
           // No records for this day, which is fine
           setDayDetail(null);
        } else {
           Toast.show({ content: '加载失败', icon: 'fail' });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDayDetail();
  }, [selectedDate, token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar 
        onBack={() => navigate('/parent')}
        className="bg-white border-b sticky top-0 z-10 shadow-sm flex-shrink-0"
        style={{ '--height': '56px' }}
      >
        <span className="text-xl font-bold text-gray-800">{t('learning_report')}</span>
      </NavBar>

      <div className="bg-white shadow-sm flex-shrink-0 p-4 pb-2">
        <InsCalendar 
          value={selectedDate}
          onChange={setSelectedDate}
          marks={historyDates}
        />
      </div>

      <div className="flex-1 p-4 pt-2 overflow-y-auto">
        {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : dayDetail ? (
            <div className="space-y-4">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none shadow-md rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <CalendarIcon size={20} />
                            {dayjs(dayDetail.date).format('MMMM D, YYYY')}
                        </h3>
                        <span className="bg-white/20 px-2 py-1 rounded text-sm font-medium">
                            {dayDetail.summary.duration_minutes} mins
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-white/10 rounded-lg p-2">
                            <div className="text-2xl font-bold">{dayDetail.summary.total_words}</div>
                            <div className="text-xs opacity-80 uppercase">Total Words</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2">
                            <div className="text-2xl font-bold">{dayDetail.summary.completed_words}</div>
                            <div className="text-xs opacity-80 uppercase">Remembered</div>
                        </div>
                    </div>
                </Card>

                <h4 className="font-bold text-gray-700 ml-1">Word List</h4>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {dayDetail.records.map((record: any, index: number) => (
                        <div 
                            key={index} 
                            className="flex items-center justify-between p-4 border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors"
                        >
                            <div>
                                <div className="font-bold text-gray-800 text-lg">{record.word}</div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock size={12} />
                                    {dayjs(record.created_at).format('HH:mm')}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500">{record.time_spent.toFixed(1)}s</span>
                                {record.result === 'remembered' ? (
                                    <CheckCircle className="text-green-500" size={24} />
                                ) : (
                                    <XCircle className="text-orange-500" size={24} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CalendarIcon size={32} className="text-gray-300" />
                </div>
                <p>No learning records for this date</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Report;
