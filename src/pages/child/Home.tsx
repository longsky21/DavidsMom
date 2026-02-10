import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd-mobile';
import { Play, Star, Home } from 'lucide-react';

const ChildHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4 relative">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
            <img 
                src="/assets/child_avatar.png?v=cool" 
                alt="Child" 
                className="w-32 h-32 rounded-full object-cover border-4 border-yellow-100 shadow-md" 
            />
        </div>
        
        <h1 className="text-3xl font-bold text-blue-600 mb-2">Ready to Learn?</h1>
        <p className="text-gray-500 mb-8">You have 5 new words today!</p>

        <Button 
            block 
            color='primary' 
            size='large' 
            shape='rounded'
            className="h-16 text-xl font-bold shadow-blue-200 shadow-lg"
            onClick={() => navigate('/child/flashcard')}
        >
            <div className="flex items-center justify-center gap-2">
                <Play fill="currentColor" />
                Start
            </div>
        </Button>
      </div>

      {/* Cartoon Back Button */}
      <div 
        className="fixed bottom-6 left-6 cursor-pointer transform transition hover:scale-110 active:scale-90 z-50"
        onClick={() => navigate('/')}
      >
        <div className="bg-orange-400 p-3 rounded-full shadow-lg border-4 border-white flex items-center justify-center">
             <Home size={32} color="white" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
};

export default ChildHome;
