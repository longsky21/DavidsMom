import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, List, Input, Modal, Toast, Card, Tag } from 'antd-mobile';
import { Plus, Search, Volume2 } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';

const WordManagement: React.FC = () => {
  const { t } = useTranslation();
  const token = useStore((state: any) => state.token);
  const [words, setWords] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [previewInfo, setPreviewInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchWords = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/words/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWords(response.data);
    } catch (error) {
      console.error(error);
      Toast.show({ content: 'Failed to load words' });
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const handleSearchPreview = async () => {
    if (!newWord) return;
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/words/search?word=${newWord}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewInfo(response.data);
    } catch (error) {
      Toast.show({ content: 'Could not find word details' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async () => {
    if (!previewInfo) return;
    try {
      await axios.post('http://localhost:8000/api/words/', {
        word: previewInfo.word,
        phonetic_us: previewInfo.phonetic_us,
        phonetic_uk: previewInfo.phonetic_uk,
        meaning: previewInfo.meaning || "Default Meaning", // Fallback if API didn't get meaning
        example: previewInfo.example,
        audio_us_url: previewInfo.audio_us_url,
        audio_uk_url: previewInfo.audio_uk_url
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ icon: 'success', content: 'Added successfully' });
      setIsModalVisible(false);
      setNewWord('');
      setPreviewInfo(null);
      fetchWords();
    } catch (error) {
      Toast.show({ icon: 'fail', content: 'Failed to add word' });
    }
  };

  const playAudio = (url: string) => {
    if(url) {
        new Audio(url).play();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">{t('word_library')}</h1>
        <Button 
            color='primary' 
            size='small' 
            onClick={() => setIsModalVisible(true)}
        >
          <div className="flex items-center gap-1">
            <Plus size={16} />
            <span>{t('add_word')}</span>
          </div>
        </Button>
      </div>

      <div className="space-y-3">
        {words.map((word) => (
          <Card key={word.id} className="bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{word.word}</h3>
                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <span>{word.phonetic_us}</span>
                    {word.audio_us_url && (
                        <Volume2 size={16} className="text-blue-500 cursor-pointer" onClick={() => playAudio(word.audio_us_url)} />
                    )}
                </div>
                <p className="text-gray-600 mt-2">{word.meaning}</p>
              </div>
              <Tag color='primary' fill='outline'>Level {word.difficulty}</Tag>
            </div>
          </Card>
        ))}
        {words.length === 0 && (
            <div className="text-center text-gray-400 mt-10">No words yet. Add one!</div>
        )}
      </div>

      <Modal
        visible={isModalVisible}
        content={
          <div className="p-2">
            <h3 className="font-bold text-lg mb-4">{t('add_word')}</h3>
            <div className="flex gap-2 mb-4">
              <Input 
                placeholder={t('search_word')} 
                value={newWord} 
                onChange={val => setNewWord(val)}
                className="border rounded px-2 py-1 flex-1"
              />
              <Button color='primary' size='small' onClick={handleSearchPreview} loading={loading}>
                <Search size={16} />
              </Button>
            </div>
            
            {previewInfo && (
              <div className="bg-gray-50 p-3 rounded mb-4 text-left">
                <div className="font-bold text-lg">{previewInfo.word}</div>
                <div className="text-sm text-gray-500 mb-2">
                    {previewInfo.phonetic_us} 
                    {previewInfo.audio_us_url && <span className="ml-2">🔊</span>}
                </div>
                <div className="mb-2">
                    <label className="text-xs text-gray-500">Meaning (Chinese)</label>
                    <Input 
                        value={previewInfo.meaning}
                        onChange={val => setPreviewInfo({...previewInfo, meaning: val})}
                        className="border-b w-full"
                    />
                </div>
              </div>
            )}
          </div>
        }
        closeOnAction
        onClose={() => {
          setIsModalVisible(false);
          setPreviewInfo(null);
        }}
        actions={[
          {
            key: 'confirm',
            text: t('submit'),
            primary: true,
            onClick: handleAddWord,
            disabled: !previewInfo
          }
        ]}
      />
    </div>
  );
};

export default WordManagement;
