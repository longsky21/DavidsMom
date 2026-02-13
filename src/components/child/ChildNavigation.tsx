import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ChildNavigationProps {
  onBack?: () => void;
  targetPath?: string; // Optional: specific path to navigate to
}

const ChildNavigation: React.FC<ChildNavigationProps> = ({ onBack, targetPath }) => {
  const navigate = useNavigate();
  const [isWinking, setIsWinking] = useState(false);

  const handleClick = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Play sound effect (mock)
    // const audio = new Audio('/assets/sounds/ding.mp3');
    // audio.play().catch(() => {});

    setIsWinking(true);
    
    setTimeout(() => {
      setIsWinking(false);
      if (onBack) {
        onBack();
      } else if (targetPath) {
        navigate(targetPath);
      } else {
        navigate(-1);
      }
    }, 300);
  };

  return (
    <motion.div
      className="fixed bottom-6 left-6 z-50 cursor-pointer"
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      onClick={handleClick}
    >
      <div className="w-[60px] h-[60px] bg-yellow-400 rounded-full border-4 border-white shadow-xl flex items-center justify-center relative overflow-hidden">
        {/* Face */}
        <div className="flex flex-col items-center justify-center w-full h-full">
            {/* Eyes */}
            <div className="flex gap-2 mb-1">
                {isWinking ? (
                    <>
                        <div className="w-2 h-2 bg-gray-800 rounded-full" />
                        <div className="w-3 h-1 bg-gray-800 rounded-full mt-1" /> {/* Wink */}
                    </>
                ) : (
                    <>
                        <div className="w-2 h-2 bg-gray-800 rounded-full" />
                        <div className="w-2 h-2 bg-gray-800 rounded-full" />
                    </>
                )}
            </div>
            {/* Mouth */}
            <div className="w-6 h-3 border-b-4 border-gray-800 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
};

export default ChildNavigation;
