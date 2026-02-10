import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd-mobile';
import { Play, Star } from 'lucide-react';

const ChildHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
            <div className="bg-yellow-100 p-6 rounded-full">
                <Star size={64} className="text-yellow-500 fill-current" />
            </div>
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
    </div>
  );
};

export default ChildHome;
