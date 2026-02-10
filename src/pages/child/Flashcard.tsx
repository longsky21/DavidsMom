import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Toast, ProgressBar } from 'antd-mobile';
import { Volume2, Check, X, ArrowRight, Home } from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';

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
  const [step, setStep] = useState(0); // 0: Word only, 1: +Image, 2: +Details
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchDailyTask();
  }, []);

  const fetchDailyTask = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/learning/today');
      setWords(response.data.words);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Toast.show('Failed to load tasks');
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const playAudio = (url: string) => {
    if(url) {
        new Audio(url).play();
    }
  };

  const handleResult = async (result: 'remembered' | 'forgot') => {
    // Record result
    try {
        await axios.post('http://localhost:8000/api/learning/record', {
            word_id: words[currentIndex].id,
            result: result,
            time_spent: 5.0 
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

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (words.length === 0) return <div className="flex justify-center items-center h-screen">No words for today!</div>;

  if (completed) {
      return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-4xl font-bold text-green-600 mb-4">Great Job! 🎉</h1>
            <p className="text-gray-600 mb-8">You finished today's words.</p>
            <Button color='primary' onClick={() => navigate('/child')}>
                <div className="flex items-center gap-2">
                    <Home /> Back Home
                </div>
            </Button>
        </div>
      )
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex) / words.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4">
        <ProgressBar percent={progress} style={{ '--track-width': '8px' }} />
        <div className="text-center text-gray-400 text-sm mt-2">{currentIndex + 1} / {words.length}</div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-4">
        <div 
            className="bg-white rounded-3xl shadow-lg p-8 min-h-[400px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
            onClick={handleCardClick}
        >
            <h1 className="text-5xl font-bold text-gray-800 mb-4">{currentWord.word}</h1>
            
            {/* Step 1: Image Hint */}
            <div className={`transition-opacity duration-500 ${step >= 1 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                {currentWord.image_url ? (
                    <img src={currentWord.image_url} alt={currentWord.word} className="w-48 h-48 object-cover rounded-xl mb-4" />
                ) : (
                    <div className="w-48 h-48 bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-gray-400">
                        No Image
                    </div>
                )}
            </div>

            {/* Step 2: Details */}
            <div className={`transition-opacity duration-500 text-center ${step >= 2 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-xl text-gray-500">/{currentWord.phonetic_us}/</span>
                    <Button 
                        fill='none' 
                        onClick={(e) => { e.stopPropagation(); playAudio(currentWord.audio_us_url); }}
                    >
                        <Volume2 className="text-blue-500" />
                    </Button>
                </div>
                <h2 className="text-2xl font-bold text-blue-600 mb-2">{currentWord.meaning}</h2>
                <p className="text-gray-500 italic">"{currentWord.example}"</p>
            </div>
            
            {step < 2 && (
                <div className="mt-8 text-gray-300 text-sm animate-pulse">Tap to reveal</div>
            )}
        </div>
      </div>

      {step >= 2 && (
        <div className="p-6 grid grid-cols-2 gap-4">
            <Button 
                block 
                color='warning' 
                size='large' 
                className="h-14 text-lg"
                onClick={() => handleResult('forgot')}
            >
                <div className="flex flex-col items-center">
                    <X size={24} />
                    <span className="text-xs">Forgot</span>
                </div>
            </Button>
            <Button 
                block 
                color='success' 
                size='large' 
                className="h-14 text-lg"
                onClick={() => handleResult('remembered')}
            >
                <div className="flex flex-col items-center">
                    <Check size={24} />
                    <span className="text-xs">Remembered</span>
                </div>
            </Button>
        </div>
      )}
    </div>
  );
};

export default Flashcard;
