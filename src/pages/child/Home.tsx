import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Video, Headphones, Star } from 'lucide-react';
import ChildLayout from '@/components/child/ChildLayout';
import { motion } from 'framer-motion';
import useStore from '@/store/useStore';
import type { UserState } from '@/store/useStore';
import axios from 'axios';

const ChildHome: React.FC = () => {
  const navigate = useNavigate();
  const token = useStore((state: UserState) => state.token);
  const childNickname = useStore((state: UserState) => state.childNickname);
  const setChildNickname = useStore((state: UserState) => state.setChildNickname);

  useEffect(() => {
    if (!token || childNickname) return;
    const fetchChildName = async () => {
      try {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const nickname = response.data?.child?.nickname;
        if (nickname) {
          setChildNickname(nickname);
        }
      } catch {
        setChildNickname(null);
      }
    };
    fetchChildName();
  }, [token, childNickname, setChildNickname]);

  const menuItems = [
    {
      title: 'Flash Card',
      icon: <Play size={32} className="text-white" fill="currentColor" />,
      path: '/child/flashcard',
      color: 'bg-orange-400',
      shadow: 'shadow-orange-200',
      delay: 0.1
    },
    {
      title: 'Fun Video',
      icon: <Video size={32} className="text-white" />,
      path: '/child/videos',
      color: 'bg-green-400',
      shadow: 'shadow-green-200',
      delay: 0.2
    },
    {
      title: 'Listening Practice',
      icon: <Headphones size={32} className="text-white" />,
      path: '/child/listening',
      color: 'bg-blue-400',
      shadow: 'shadow-blue-200',
      delay: 0.3
    }
  ];

  return (
    <ChildLayout bgClass="bg-sky-50" backPath="/">
      <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-md mx-auto">
        
        {/* Avatar Section */}
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8 relative"
        >
            <div className="absolute -top-4 -right-4 animate-bounce">
                <Star className="text-yellow-400 fill-yellow-400" size={32} />
            </div>
            <img 
                src="/assets/child_avatar.png" 
                alt="Child" 
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl" 
                onError={(e) => {
                    e.currentTarget.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";
                }}
            />
            <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-2 border-white"></div>
        </motion.div>
        
        <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl font-black text-gray-800 mb-2 tracking-tight"
        >
            Hello, {childNickname || 'Baby'}!
        </motion.h1>
        <p className="text-gray-500 mb-10 font-medium">Ready to play?</p>

        {/* Menu Grid */}
        <div className="grid gap-5 w-full px-4">
            {menuItems.map((item, index) => (
                <motion.div
                    key={index}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: item.delay, type: "spring" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(item.path)}
                    className={`${item.color} ${item.shadow} h-20 rounded-2xl shadow-lg flex items-center px-6 cursor-pointer relative overflow-hidden group`}
                >
                    <div className="bg-white/20 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                        {item.icon}
                    </div>
                    <span className="text-2xl font-bold text-white tracking-wide">{item.title}</span>
                    
                    {/* Decor */}
                    <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full" />
                </motion.div>
            ))}
        </div>
      </div>
    </ChildLayout>
  );
};

export default ChildHome;
