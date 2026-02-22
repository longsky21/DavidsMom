import React, { useEffect, useRef, useMemo } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TranscriptLine } from '../lib/srtParser';

interface TranscriptProps {
  transcript: TranscriptLine[];
}

export const Transcript: React.FC<TranscriptProps> = ({ transcript }) => {
  const { currentTime, requestSeek } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const activeIndex = useMemo(() => {
    return transcript.findIndex(line => currentTime >= line.start && currentTime < line.end);
  }, [currentTime, transcript]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  return (
    <div 
      ref={containerRef} 
      className="h-full overflow-y-auto px-4 py-8 space-y-6 scroll-smooth"
    >
      {transcript.map((line, index) => {
        const isActive = index === activeIndex;
        
        // Split words for simulated word-level sync
        const words = line.text.split(/\s+/);
        const duration = line.end - line.start;
        const timePerWord = duration / Math.max(1, words.length);
        
        return (
          <div
            key={line.id}
            ref={isActive ? activeLineRef : null}
            className={`
              transition-all duration-300 p-6 rounded-2xl cursor-pointer
              ${isActive ? 'bg-white/10 shadow-lg scale-105' : 'hover:bg-white/5 opacity-60'}
            `}
            onClick={() => requestSeek(line.start)}
          >
            <p className="text-lg lg:text-base font-medium leading-relaxed text-center flex flex-wrap justify-center gap-x-1.5">
              {words.map((word, wIndex) => {
                // Calculate if this specific word is "active" or "passed"
                const wordStart = line.start + (wIndex * timePerWord);
                const isPassed = isActive && currentTime >= wordStart;
                
                return (
                  <span 
                    key={wIndex}
                    className={`
                      transition-colors duration-150
                      ${isActive 
                        ? (isPassed ? 'text-yellow-400' : 'text-white') 
                        : 'text-gray-300'}
                    `}
                  >
                    {word}
                  </span>
                );
              })}
            </p>
            {/* Debug info */}
            {/* <div className="text-xs text-gray-500 mt-2 text-center">{line.start.toFixed(1)}s - {line.end.toFixed(1)}s</div> */}
          </div>
        );
      })}
      
      {/* Spacer to allow last item to scroll to center */}
      <div className="h-[50vh]" />
    </div>
  );
};
