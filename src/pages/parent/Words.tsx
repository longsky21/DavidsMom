import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, List, Input, Modal, Toast, Card, Tag, NavBar, Popup, FloatingBubble, SwipeAction, Dialog } from 'antd-mobile';
import { Plus, Search, Volume2, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';

const ImageWithPlaceholder = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300 animate-pulse">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <img 
                src={src} 
                alt={alt} 
                className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
            />
        </div>
    );
};

const WordManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useStore((state: any) => state.token);
  const [words, setWords] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [previewInfo, setPreviewInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchWords = async () => {
    try {
      const response = await axios.get('/api/words/', {
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
    setPreviewInfo(null);
    try {
      const response = await axios.get(`/api/words/search?word=${newWord}`, {
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
      await axios.post('/api/words/', {
        word: previewInfo.word,
        phonetic_us: previewInfo.phonetic_us,
        phonetic_uk: previewInfo.phonetic_uk,
        meaning: previewInfo.meaning || "Default Meaning", // Fallback if API didn't get meaning
        example: previewInfo.example,
        audio_us_url: previewInfo.audio_us_url,
        audio_uk_url: previewInfo.audio_uk_url,
        image_url: previewInfo.image_url
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
    if(!url) {
        Toast.show('暂无发音');
        return;
    }
    const audio = new Audio(url);
    audio.play().catch(e => {
        console.error("Audio play error", e);
        Toast.show('播放失败');
    });
  }

  const handleDelete = async (id: number) => {
    const result = await Dialog.confirm({ content: '确定要删除这个单词吗？' });
    if (!result) return;

    try {
        await axios.delete(`/api/words/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        Toast.show('已删除');
        fetchWords();
    } catch (e) {
        Toast.show('删除失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        onBack={() => navigate('/parent')}
        className="bg-white border-b sticky top-0 z-10"
      >
        {t('word_library')}
      </NavBar>

      <div className="p-4 space-y-3">
        {words.map((word) => (
          <SwipeAction
            key={word.id}
            rightActions={[
              {
                key: 'delete',
                text: '删除',
                color: 'danger',
                onClick: () => handleDelete(word.id),
              },
            ]}
          >
            <Card 
                className="bg-white active:bg-gray-50 transition-colors"
                onClick={() => {
                    setSelectedWord(word);
                    setIsDetailVisible(true);
                }}
            >
            <div className="flex justify-between items-start">
              <div className="flex gap-3 items-start">
                {word.image_url && (
                    <ImageWithPlaceholder src={word.image_url} alt={word.word} className="w-16 h-16 rounded flex-shrink-0" />
                )}
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{word.word}</h3>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <span>{word.phonetic_us}</span>
                        {word.audio_us_url && (
                            <Volume2 size={16} className="text-blue-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); playAudio(word.audio_us_url); }} />
                        )}
                    </div>
                    <p className="text-gray-600 mt-2">{word.meaning}</p>
                </div>
              </div>
              <Tag color='primary' fill='outline'>Level {word.difficulty}</Tag>
            </div>
          </Card>
          </SwipeAction>
        ))}
        {words.length === 0 && (
            <div className="text-center text-gray-400 mt-10">No words yet. Add one!</div>
        )}
      </div>

      <FloatingBubble
        axis='xy'
        magnetic='x'
        style={{
            '--initial-position-bottom': '24px',
            '--initial-position-right': '24px',
            '--z-index': '1000',
        }}
        onClick={() => setIsModalVisible(true)}
      >
        <Plus size={32} color="#ffffff" />
      </FloatingBubble>

      <Modal
        visible={isModalVisible}
        bodyStyle={{ minWidth: '80vw' }}
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
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                    <span>{previewInfo.phonetic_us}</span>
                    {previewInfo.audio_us_url && (
                        <Volume2 
                            size={18} 
                            className="text-blue-500 cursor-pointer" 
                            onClick={() => playAudio(previewInfo.audio_us_url)} 
                        />
                    )}
                </div>
                {previewInfo.image_url && (
                    <div className="mb-2 text-center">
                        <ImageWithPlaceholder src={previewInfo.image_url} alt={previewInfo.word} className="w-32 h-32 mx-auto rounded shadow-sm" />
                    </div>
                )}
                <div className="mb-2">
                    <label className="text-xs text-gray-500">Meaning (Chinese)</label>
                    <Input 
                        value={previewInfo.meaning}
                        onChange={val => setPreviewInfo({...previewInfo, meaning: val})}
                        className="border-b w-full"
                    />
                </div>
                {previewInfo.example && (
                    <div className="mb-2">
                        <label className="text-xs text-gray-500">Example</label>
                        <div className="text-sm text-gray-600 italic border-b pb-1">{previewInfo.example}</div>
                    </div>
                )}
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

      <Popup
        visible={isDetailVisible}
        onMaskClick={() => setIsDetailVisible(false)}
        bodyStyle={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px', minHeight: '60vh', maxHeight: '90vh' }}
      >
        {selectedWord && (
            <div className="p-6 flex flex-col items-center overflow-y-auto h-full">
                {selectedWord.image_url && (
                    <ImageWithPlaceholder src={selectedWord.image_url} alt={selectedWord.word} className="w-64 h-64 rounded-xl mb-6 shadow-md flex-shrink-0" />
                )}
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedWord.word}</h2>
                
                <div className="flex gap-4 mb-6">
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                        <span className="text-sm font-medium text-gray-500">US</span>
                        <span className="text-gray-800 font-medium">/{selectedWord.phonetic_us}/</span>
                        {selectedWord.audio_us_url && (
                            <Volume2 size={18} className="text-blue-500 cursor-pointer" onClick={() => playAudio(selectedWord.audio_us_url)} />
                        )}
                    </div>
                </div>

                <div className="w-full text-left bg-blue-50 p-4 rounded-xl mb-4">
                    <div className="text-xs text-blue-400 font-bold uppercase mb-1">Meaning</div>
                    <div className="text-xl text-gray-800 font-medium">{selectedWord.meaning}</div>
                </div>

                {selectedWord.example && (
                    <div className="w-full text-left bg-gray-50 p-4 rounded-xl mb-4">
                        <div className="text-xs text-gray-400 font-bold uppercase mb-1">Example</div>
                        <div className="text-gray-600 italic">"{selectedWord.example}"</div>
                    </div>
                )}
                
                <div className="mt-auto w-full pt-4">
                    <Button block color='primary' fill='outline' onClick={() => setIsDetailVisible(false)}>
                        Close
                    </Button>
                </div>
            </div>
        )}
      </Popup>
    </div>
  );
};

export default WordManagement;
