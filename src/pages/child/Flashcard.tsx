import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { Volume2, Check, X } from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';
import ChildLayout from '@/components/child/ChildLayout';
import { motion, AnimatePresence } from 'framer-motion';

interface Word {
    id: string;
    word: string;
    phonetic_us: string;
    meaning: string;
    image_url: string;
    audio_us_url: string;
    example: string;
}

const Flashcard: React.FC = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState(0); // 0: word only, 1: +image, 2: +meaning/example
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const token = useStore((state: UserState) => state.token);

  const fetchDailyTask = useCallback(async () => {
    try {
      const response = await axios.get('/api/learning/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWords(response.data.words);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Toast.show('Failed to load tasks');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDailyTask();
  }, [fetchDailyTask]);

  const handleCardClick = () => {
    if (step < 2) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep === 2 && words[currentIndex]) {
        playAudio(words[currentIndex].audio_us_url);
      }
    }
  };

  const playAudio = (url: string) => {
    if(!url) return;
    const audio = new Audio(url);
    audio.play().catch(e => {
        console.error("Audio play error", e);
    });
  };

  const handleResult = async (result: 'remembered' | 'forgot') => {
    // Record result
    try {
        await axios.post('/api/learning/record', {
            word_id: words[currentIndex].id,
            result: result,
            time_spent: 5.0 
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch(e) {
        console.error(e);
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setStep(0);
    } else {
      setCompleted(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  if (loading) return (
      <ChildLayout bgClass="bg-orange-50">
          <div className="flex justify-center items-center h-full text-2xl font-bold text-orange-400">Loading...</div>
      </ChildLayout>
  );

  if (words.length === 0) return (
      <ChildLayout bgClass="bg-orange-50" onBack={() => navigate('/child')}>
          <div className="flex justify-center items-center h-full text-2xl font-bold text-orange-400">No words for today!</div>
      </ChildLayout>
  );

  if (completed) {
      return (
        <ChildLayout bgClass="bg-green-50" onBack={() => navigate('/child')}>
            <div className="flex flex-1 flex-col items-center justify-center w-full text-center pt-8">
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mb-8 text-8xl"
                >
                    🎉
                </motion.div>
                <h1 className="text-4xl font-black text-green-600 mb-4">Great Job!</h1>
                <p className="text-xl text-gray-600 mb-12 font-medium">You finished today's words.</p>
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/child')}
                    className="bg-green-500 text-white px-8 py-4 rounded-full text-xl font-bold shadow-lg shadow-green-200"
                >
                    Back Home
                </motion.button>
            </div>
        </ChildLayout>
      )
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex) / words.length) * 100;

  return (
    <ChildLayout bgClass="bg-orange-50" onBack={() => navigate('/child')}>
      <div className="flex flex-col h-full w-full max-w-md mx-auto relative">
        {/* Progress Bar */}
        <div className="w-full h-4 bg-orange-100 rounded-full mb-6 overflow-hidden border-2 border-white shadow-sm">
            <motion.div 
                className="h-full bg-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
            />
        </div>
        <div className="text-center text-orange-400 font-bold mb-4">{currentIndex + 1} / {words.length}</div>

        {/* Flashcard Container */}
        <motion.div
          className="flex-1 w-full"
          key={currentWord.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="w-full bg-white rounded-3xl shadow-xl border-4 border-white p-6 flex flex-col items-center justify-start cursor-pointer overflow-hidden min-h-[520px] max-h-[72vh]"
            onClick={handleCardClick}
          >
            <div className="w-full flex flex-col items-center flex-1 overflow-y-auto">
              <h1 className="text-5xl font-black text-gray-800 mt-6 mb-4 text-center break-words">
                {currentWord.word}
              </h1>

              <AnimatePresence>
                {step >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25 }}
                    className="w-full mt-4"
                  >
                    <div className="w-full rounded-2xl overflow-hidden bg-gray-100 shadow-inner border border-gray-100">
                      {currentWord.image_url ? (
                        <img
                          src={currentWord.image_url}
                          alt={currentWord.word}
                          className="w-full h-[260px] object-cover"
                        />
                      ) : (
                        <div className="w-full h-[260px] flex items-center justify-center text-gray-300 font-bold text-xl">
                          No Image
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {step >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25 }}
                    className="w-full mt-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="text-gray-400 font-mono">/{currentWord.phonetic_us}/</div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => playAudio(currentWord.audio_us_url)}
                        className="p-2 bg-blue-100 rounded-full text-blue-500"
                      >
                        <Volume2 size={24} />
                      </motion.button>
                    </div>

                    <p className="text-2xl font-black text-orange-500 text-center mb-3 break-words">
                      {currentWord.meaning}
                    </p>
                    <p className="text-gray-500 italic text-center text-base break-words">
                      "{currentWord.example}"
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {step < 2 && (
                <div className="mt-8 text-gray-300 text-sm animate-pulse font-medium">
                  Tap to reveal
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Controls (Only show when flipped) */}
        <AnimatePresence>
            {step >= 2 && (
                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="grid grid-cols-2 gap-4 mt-6 pb-20"
                >
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleResult('forgot')}
                        className="bg-white border-2 border-orange-200 text-orange-500 h-16 rounded-2xl font-bold text-lg shadow-sm flex flex-col items-center justify-center"
                    >
                        <X size={24} />
                        <span className="text-xs mt-1">Try Again</span>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleResult('remembered')}
                        className="bg-green-500 text-white h-16 rounded-2xl font-bold text-lg shadow-green-200 shadow-lg flex flex-col items-center justify-center"
                    >
                        <Check size={24} />
                        <span className="text-xs mt-1">Got It!</span>
                    </motion.button>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </ChildLayout>
  );
};

export default Flashcard;
