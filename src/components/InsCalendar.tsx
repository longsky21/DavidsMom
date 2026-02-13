import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import classNames from 'classnames';

export interface DayMarks {
  hasWords?: boolean;
  hasVideo?: boolean;
  hasAudio?: boolean;
}

interface InsCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  marks?: Map<string, DayMarks>; // Map of date strings 'YYYY-MM-DD' to DayMarks
}

const InsCalendar: React.FC<InsCalendarProps> = ({ value, onChange, marks }) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs(value));
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'none'>('none');
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync internal state if external value changes significantly (e.g. year/month change)
  useEffect(() => {
    if (!currentMonth.isSame(value, 'month')) {
      setCurrentMonth(dayjs(value));
    }
  }, [value]);

  const animateTransition = (direction: 'left' | 'right', callback: () => void) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection(direction);
    
    setTimeout(() => {
        callback();
        setSlideDirection('none');
        setIsAnimating(false);
    }, 300); // Duration matches CSS transition
  };

  const handlePrevMonth = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    animateTransition('right', () => setCurrentMonth(prev => prev.subtract(1, 'month')));
  };

  const handleNextMonth = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    animateTransition('left', () => setCurrentMonth(prev => prev.add(1, 'month')));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe Left -> Next Month
      handleNextMonth();
    } else if (distance < -minSwipeDistance) {
      // Swipe Right -> Prev Month
      handlePrevMonth();
    }
  };

  const handleDateClick = (date: dayjs.Dayjs) => {
    onChange(date.toDate());
  };

  const renderDays = () => {
    const startOfMonth = currentMonth.startOf('month');
    const startDayOfWeek = startOfMonth.day(); // 0 (Sunday) to 6 (Saturday)
    const daysInMonth = currentMonth.daysInMonth();

    const days = [];

    // Padding for previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-7 w-full" />);
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = currentMonth.date(i);
      const dateStr = date.format('YYYY-MM-DD');
      const isSelected = date.isSame(value, 'day');
      const isToday = date.isSame(dayjs(), 'day');
      const dateMark = marks?.get(dateStr);
      const hasAnyActivity = dateMark && (dateMark.hasWords || dateMark.hasVideo || dateMark.hasAudio);

      days.push(
        <div
          key={i}
          onClick={() => handleDateClick(date)}
          className="flex flex-col items-center justify-start h-9 w-full relative cursor-pointer pt-0.5"
        >
          <div
            className={classNames(
              "h-6 w-6 flex items-center justify-center rounded-md text-[13px] font-medium transition-all duration-300",
              {
                "bg-[#4A90E2] text-white shadow-md": isSelected, // Selected: Deep Blue
                "bg-[#E8F3FF] text-[#4A90E2]": hasAnyActivity && !isSelected, // Has Mark but not selected: Light Blue
                "text-gray-700": !isSelected && !hasAnyActivity,
                "font-bold": isToday,
                "border border-gray-200": isToday && !isSelected && !hasAnyActivity
              }
            )}
          >
            {i}
          </div>
          <div className="flex space-x-[2px] mt-0.5 h-1 items-center justify-center">
            {dateMark?.hasWords && <div className="w-1 h-1 rounded-full bg-yellow-400" />}
            {dateMark?.hasVideo && <div className="w-1 h-1 rounded-full bg-green-500" />}
            {dateMark?.hasAudio && <div className="w-1 h-1 rounded-full bg-blue-500" />}
          </div>
        </div>
      );
    }

    return days;
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div 
      className="bg-white px-2 py-2 rounded-xl shadow-sm border border-gray-100 touch-pan-y relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation Arrows (Absolute positioned) */}
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-gray-500 cursor-pointer z-10"
        onClick={handlePrevMonth}
      >
        <ChevronLeft size={16} />
      </div>
      <div 
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-gray-500 cursor-pointer z-10"
        onClick={handleNextMonth}
      >
        <ChevronRight size={16} />
      </div>

      <div className="text-center text-xs font-bold text-gray-400 mb-1">
          {currentMonth.format('MMMM YYYY')}
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 mb-1 text-center px-4">
        {weekDays.map((day, index) => (
          <div key={index} className="text-[10px] font-bold text-gray-300 h-4 flex items-center justify-center uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="overflow-hidden relative min-h-[160px]">
          <div 
            className={classNames(
                "grid grid-cols-7 gap-y-0 justify-items-center px-4 transition-transform duration-300 ease-in-out absolute w-full",
                {
                    "translate-x-0 opacity-100": slideDirection === 'none',
                    "-translate-x-10 opacity-0": slideDirection === 'left',
                    "translate-x-10 opacity-0": slideDirection === 'right',
                }
            )}
          >
            {renderDays()}
          </div>
      </div>
    </div>
  );
};

export default InsCalendar;
