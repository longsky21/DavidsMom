import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Card, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, Video, Headphones, BookOpen } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';
import dayjs from 'dayjs';
import InsCalendar, { DayMarks } from '@/components/InsCalendar';
import type { UserState } from '@/store/useStore';
import { Collapse } from 'antd-mobile';

interface HistoryDateItem {
  date: string;
  has_words: boolean;
  has_video: boolean;
  has_audio: boolean;
}

interface DayDetailRecord {
  word: string;
  created_at: string;
  time_spent: number;
  result: 'remembered' | 'forgot';
}

interface MediaSessionDetailItem {
  resource_title: string;
  module: string;
  duration_seconds: number;
  completion_percent: number;
  started_at: string;
}

interface DayDetail {
  date: string;
  summary: {
    duration_minutes: number;
    total_words: number;
    completed_words: number;
    has_words: boolean;
    has_video: boolean;
    has_audio: boolean;
  };
  records: DayDetailRecord[];
  video_sessions: MediaSessionDetailItem[];
  audio_sessions: MediaSessionDetailItem[];
}

const Report: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = useStore((state: UserState) => state.token);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [historyDates, setHistoryDates] = useState<Map<string, DayMarks>>(new Map());
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Load history dates (to mark on calendar)
  useEffect(() => {
    const fetchHistoryDates = async () => {
      try {
        const response = await axios.get('/api/learning/history/dates', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dates = new Map<string, DayMarks>();
        (response.data as HistoryDateItem[]).forEach((item) => {
          dates.set(item.date, {
            hasWords: item.has_words,
            hasVideo: item.has_video,
            hasAudio: item.has_audio
          });
        });
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
        setDayDetail(response.data as DayDetail);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
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
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/10 rounded-lg p-2">
                            <div className="text-xl font-bold">{dayDetail.summary.total_words}</div>
                            <div className="text-[10px] opacity-80 uppercase">Words</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2">
                            <div className="text-xl font-bold">{dayDetail.video_sessions.length}</div>
                            <div className="text-[10px] opacity-80 uppercase">Video</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2">
                            <div className="text-xl font-bold">{dayDetail.audio_sessions.length}</div>
                            <div className="text-[10px] opacity-80 uppercase">Audio</div>
                        </div>
                    </div>
                </Card>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <Collapse defaultActiveKey={['words', 'videos', 'audios']}>
                    {dayDetail.records.length > 0 && (
                      <Collapse.Panel key='words' title={
                        <div className="flex items-center gap-2 font-bold text-gray-700">
                          <BookOpen size={18} className="text-yellow-500" />
                          <span>Words</span>
                          <span className="text-xs font-normal text-gray-400">({dayDetail.records.length})</span>
                        </div>
                      }>
                        <div className="divide-y divide-gray-50">
                          {dayDetail.records.map((record, index) => (
                              <div 
                                  key={index} 
                                  className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                              >
                                  <div>
                                      <div className="font-bold text-gray-800 text-base">{record.word}</div>
                                      <div className="text-xs text-gray-400 flex items-center gap-1">
                                          <Clock size={12} />
                                          {dayjs(record.created_at).format('HH:mm')}
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <span className="text-sm text-gray-500">{record.time_spent.toFixed(1)}s</span>
                                      {record.result === 'remembered' ? (
                                          <CheckCircle className="text-green-500" size={20} />
                                      ) : (
                                          <XCircle className="text-orange-500" size={20} />
                                      )}
                                  </div>
                              </div>
                          ))}
                        </div>
                      </Collapse.Panel>
                    )}

                    {dayDetail.video_sessions.length > 0 && (
                      <Collapse.Panel key='videos' title={
                        <div className="flex items-center gap-2 font-bold text-gray-700">
                          <Video size={18} className="text-green-500" />
                          <span>Video</span>
                          <span className="text-xs font-normal text-gray-400">({dayDetail.video_sessions.length})</span>
                        </div>
                      }>
                         <div className="divide-y divide-gray-50">
                          {dayDetail.video_sessions.map((session, index) => (
                              <div 
                                  key={index} 
                                  className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                              >
                                  <div className="flex-1 min-w-0 pr-4">
                                      <div className="font-bold text-gray-800 text-base truncate">{session.resource_title}</div>
                                      <div className="text-xs text-gray-400 flex items-center gap-1">
                                          <Clock size={12} />
                                          {dayjs(session.started_at).format('HH:mm')}
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                      <span className="text-sm text-gray-500">{Math.round(session.duration_seconds / 60)} mins</span>
                                      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{Math.round(session.completion_percent)}% completed</span>
                                  </div>
                              </div>
                          ))}
                        </div>
                      </Collapse.Panel>
                    )}

                    {dayDetail.audio_sessions.length > 0 && (
                      <Collapse.Panel key='audios' title={
                        <div className="flex items-center gap-2 font-bold text-gray-700">
                          <Headphones size={18} className="text-blue-500" />
                          <span>Audio</span>
                          <span className="text-xs font-normal text-gray-400">({dayDetail.audio_sessions.length})</span>
                        </div>
                      }>
                         <div className="divide-y divide-gray-50">
                          {dayDetail.audio_sessions.map((session, index) => (
                              <div 
                                  key={index} 
                                  className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                              >
                                  <div className="flex-1 min-w-0 pr-4">
                                      <div className="font-bold text-gray-800 text-base truncate">{session.resource_title}</div>
                                      <div className="text-xs text-gray-400 flex items-center gap-1">
                                          <Clock size={12} />
                                          {dayjs(session.started_at).format('HH:mm')}
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                      <span className="text-sm text-gray-500">{Math.round(session.duration_seconds / 60)} mins</span>
                                      <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{Math.round(session.completion_percent)}% completed</span>
                                  </div>
                              </div>
                          ))}
                        </div>
                      </Collapse.Panel>
                    )}
                  </Collapse>
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
