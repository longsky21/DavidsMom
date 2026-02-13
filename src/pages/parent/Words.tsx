import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Toast, Card, Tag, NavBar, Popup, FloatingBubble, SwipeAction, Dialog, InfiniteScroll } from 'antd-mobile';
import { Plus, Search, Volume2 } from 'lucide-react';
import axios from 'axios';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';

interface WordItem {
  id: number;
  word: string;
  difficulty: number;
  phonetic_us?: string;
  phonetic_uk?: string;
  meaning?: string;
  example?: string;
  audio_us_url?: string;
  audio_uk_url?: string;
  image_url?: string;
}

interface WordPreview {
  word: string;
  phonetic_us?: string;
  phonetic_uk?: string;
  meaning: string;
  example?: string;
  audio_us_url?: string;
  audio_uk_url?: string;
  image_url?: string;
}

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
  const token = useStore((state: UserState) => state.token);
  const [words, setWords] = useState<WordItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [previewInfo, setPreviewInfo] = useState<WordPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isTyping = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    const fetchSuggestions = async () => {
        if (!isTyping.current) return;

        if (newWord.length >= 3) {
            try {
                const response = await axios.get(`/api/words/suggest?q=${newWord}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuggestions(response.data as string[]);
                setShowSuggestions(true);
            } catch {
                console.error("Failed to fetch suggestions");
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [newWord, token]);

  const loadMore = async () => {
    try {
      const response = await axios.get(`/api/words/?skip=${page * limit}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newWords = response.data as WordItem[];
      if (newWords.length > 0) {
        setWords(prev => [...prev, ...newWords]);
        setPage(prev => prev + 1);
        if (newWords.length < limit) {
             setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error(error);
      Toast.show({ content: 'Failed to load words' });
      setHasMore(false);
    }
  };

  const handleSearchPreview = async () => {
    isTyping.current = false;
    if (!newWord) return;
    await performSearch(newWord);
  };
  
  const performSearch = async (word: string) => {
    setLoading(true);
    setPreviewInfo(null);
    setShowSuggestions(false);
    try {
      const response = await axios.get(`/api/words/search?word=${word}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data as WordPreview;
      setPreviewInfo(data);
      if (data.word) {
          setNewWord(data.word);
      }
    } catch {
      Toast.show({ content: 'Could not find word details' });
      setPreviewInfo(null);
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
        meaning: previewInfo.meaning || "Default Meaning",
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
      
      // Reset list to reload
      setWords([]);
      setPage(0);
      setHasMore(true);
      // loadMore will be triggered by InfiniteScroll when hasMore becomes true and list is empty/short
    } catch {
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
        setWords(prev => prev.filter(w => w.id !== id));
    } catch {
        Toast.show('删除失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        onBack={() => navigate('/parent')}
        className="bg-white border-b sticky top-0 z-10 shadow-sm"
        style={{ '--height': '56px' }}
      >
        <span className="text-xl font-bold text-gray-800">{t('word_library')}</span>
      </NavBar>

      <div className="p-4 space-y-4">
        {words.map((word) => (
          <SwipeAction
            key={word.id}
            rightActions={[
              {
                key: 'delete',
                text: 'Delete',
                color: 'danger',
                onClick: () => handleDelete(word.id),
              },
            ]}
          >
            <Card 
                className="bg-white active:bg-gray-50 transition-all h-28 flex flex-col justify-center shadow-sm hover:shadow-md rounded-xl border border-gray-100 overflow-hidden"
                onClick={() => {
                    setSelectedWord(word);
                    setIsDetailVisible(true);
                }}
            >
            <div className="flex justify-between items-start h-full p-1">
              <div className="flex gap-4 items-center h-full w-full overflow-hidden">
                {word.image_url ? (
                    <div className="w-20 h-20 rounded-lg p-1 bg-gray-50 flex-shrink-0 border border-gray-100">
                        <ImageWithPlaceholder src={word.image_url} alt={word.word} className="w-full h-full rounded-md object-cover" />
                    </div>
                ) : (
                    <div className="w-20 h-20 rounded-lg p-1 bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300">
                         <span className="text-xs">No Image</span>
                    </div>
                )}
                
                <div className="flex-1 min-w-0 flex flex-col justify-center h-full py-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xl font-bold text-gray-800 truncate tracking-tight">{word.word}</h3>
                        <Tag color='primary' fill='outline' className="flex-shrink-0 ml-2 rounded-md px-2">Lv {word.difficulty}</Tag>
                    </div>
                    
                    <div className="text-sm text-gray-500 flex items-center gap-2 mb-2">
                        <span className="font-medium">/{word.phonetic_us}/</span>
                        {word.audio_us_url && (
                            <div 
                                className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                                onClick={(e) => { e.stopPropagation(); playAudio(word.audio_us_url); }}
                            >
                                <Volume2 size={14} className="text-blue-500" />
                            </div>
                        )}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-1 overflow-hidden text-ellipsis leading-tight flex-1">
                        {word.meaning}
                    </p>
                </div>
              </div>
            </div>
          </Card>
          </SwipeAction>
        ))}
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        {words.length === 0 && !hasMore && (
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
        onClose={() => {
            setIsModalVisible(false);
            setPreviewInfo(null);
            setNewWord('');
        }}
        closeOnMaskClick
        bodyStyle={{ 
            minWidth: '85vw', 
            minHeight: '300px',
            borderRadius: '16px',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0
        }}
        content={
          <div className="p-2 flex flex-col h-full">
            <h3 className="font-bold text-lg mb-4 text-center">{t('add_word')}</h3>
            <div className="flex gap-2 mb-4 relative z-50">
              <div className="flex-1 relative">
                <Input 
                  placeholder={t('search_word')} 
                  value={newWord} 
                  onChange={val => {
                      isTyping.current = true;
                      setNewWord(val);
                      if (val.length < 3) setShowSuggestions(false);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-100 transition-all"
                  onEnterPress={handleSearchPreview}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-lg shadow-xl z-[100] max-h-48 overflow-y-auto mt-2 py-1">
                      {suggestions.map((suggestion, index) => (
                          <div 
                              key={index}
                              className="px-4 py-2.5 hover:bg-blue-50 active:bg-blue-100 cursor-pointer text-base text-gray-700 transition-colors"
                              onClick={() => {
                                  isTyping.current = false;
                                  setNewWord(suggestion);
                                  setShowSuggestions(false);
                                  performSearch(suggestion);
                              }}
                          >
                              {suggestion}
                          </div>
                      ))}
                  </div>
                )}
              </div>
              <Button color='primary' size='middle' onClick={handleSearchPreview} loading={loading} className="rounded-lg">
                <Search size={20} />
              </Button>
            </div>
            
            {previewInfo && (
              <div className="bg-blue-50/50 p-4 rounded-xl mb-4 text-left border border-blue-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-xl text-gray-800">{previewInfo.word}</div>
                    {previewInfo.image_url && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white shadow-sm">
                             <ImageWithPlaceholder src={previewInfo.image_url} alt={previewInfo.word} className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
                
                <div className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                    <span className="bg-white px-2 py-0.5 rounded text-xs border border-blue-100">US</span>
                    <span className="font-medium">/{previewInfo.phonetic_us}/</span>
                    {previewInfo.audio_us_url && (
                        <div 
                            className="w-6 h-6 rounded-full bg-white flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                            onClick={() => playAudio(previewInfo.audio_us_url)} 
                        >
                            <Volume2 size={14} className="text-blue-500" />
                        </div>
                    )}
                </div>

                <div className="mb-3">
                    <label className="text-xs text-blue-400 font-bold uppercase mb-1 block">Meaning</label>
                    <Input 
                        value={previewInfo.meaning}
                        onChange={(val) => setPreviewInfo((prev) => (prev ? { ...prev, meaning: val } : prev))}
                        className="bg-white border border-blue-100 rounded px-2 py-1 w-full text-sm"
                    />
                </div>
                {previewInfo.example && (
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Example</label>
                        <div className="text-sm text-gray-600 italic bg-white/50 p-2 rounded border border-gray-100">{previewInfo.example}</div>
                    </div>
                )}
              </div>
            )}
          </div>
        }
        actions={[
          {
            key: 'confirm',
            text: t('submit'),
            primary: true,
            onClick: handleAddWord,
            disabled: !previewInfo || !previewInfo.word,
            className: "w-full"
          }
        ]}
      />

      <Popup
        visible={isDetailVisible}
        onMaskClick={() => setIsDetailVisible(false)}
        bodyStyle={{ 
            borderTopLeftRadius: '20px', 
            borderTopRightRadius: '20px', 
            minHeight: '60vh', 
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
        }}
      >
        {selectedWord && (
            <>
            <div className="p-6 flex flex-col items-center overflow-y-auto flex-1">
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
                
                {/* Spacer for fixed footer */}
                <div className="h-20"></div>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 flex gap-3 sticky bottom-0 z-10 safe-area-bottom">
                <Button block color='danger' fill='outline' onClick={() => {
                    setIsDetailVisible(false);
                    handleDelete(selectedWord.id);
                }}>
                    Delete
                </Button>
                <Button block color='primary' fill='outline' onClick={() => setIsDetailVisible(false)} style={{ borderColor: '#3b82f6', color: '#3b82f6' }}>
                    Close
                </Button>
            </div>
            </>
        )}
      </Popup>
    </div>
  );
};

export default WordManagement;
