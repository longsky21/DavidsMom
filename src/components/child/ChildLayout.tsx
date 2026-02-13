import React from 'react';
import ChildNavigation from './ChildNavigation';

interface ChildLayoutProps {
  children: React.ReactNode;
  bgClass?: string;
  onBack?: () => void;
  backPath?: string;
}

const ChildLayout: React.FC<ChildLayoutProps> = ({ children, bgClass = "bg-sky-100", onBack, backPath }) => {
  return (
    <div className={`min-h-screen w-full ${bgClass} relative overflow-hidden font-sans flex flex-col`}>
      {/* Decorative Circles */}
      <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-[-20px] left-[20%] w-60 h-60 bg-yellow-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="w-full flex-1 p-4 pb-24 flex flex-col">
        {children}
      </div>

      {/* Navigation */}
      <ChildNavigation onBack={onBack} targetPath={backPath} />
    </div>
  );
};

export default ChildLayout;
