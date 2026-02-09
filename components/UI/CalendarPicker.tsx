
import React, { useState, useMemo } from 'react';
import { Task } from '../../types';
import { Button } from './Button';

interface CalendarPickerProps {
  initialDate: Date;
  tasks: Task[];
  onSelect: (dateStr: string) => void;
  onCancel?: () => void;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({ initialDate, tasks, onSelect, onCancel }) => {
  const [viewDate, setViewDate] = useState(new Date(initialDate));

  // タスクがある日付のマップを作成 (YYYY-MM-DD -> colors[])
  const tasksByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    tasks.forEach(t => {
      if (!map[t.date]) {
        map[t.date] = [];
      }
      map[t.date].push(t.color || 'bg-blue-500');
    });
    return map;
  }, [tasks]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    if (!onCancel) {
        onSelect(today.toISOString().split('T')[0]);
    }
  };

  // カレンダーグリッド生成
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0: Sun, 1: Mon...

  const days = useMemo(() => {
      const d: (number | null)[] = [];
      for (let i = 0; i < firstDayOfWeek; i++) d.push(null);
      for (let i = 1; i <= daysInMonth; i++) d.push(i);
      // 6週間（42セル）分確保
      while (d.length < 42) d.push(null);
      return d;
  }, [firstDayOfWeek, daysInMonth]);

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDateStr = initialDate.toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-4 w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button 
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
        </button>
        <div className="font-bold text-slate-700 text-lg">
            {year}年 {month + 1}月
        </div>
        <button 
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
            <div key={day} className={`text-xs font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
                {day}
            </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
            if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square"></div>;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDateStr;
            const dayColors = tasksByDate[dateStr] || [];
            const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;

            return (
                <button
                    key={dateStr}
                    onClick={() => onSelect(dateStr)}
                    className={`
                        aspect-square rounded-full flex flex-col items-center justify-center relative transition-all
                        hover:bg-blue-50 hover:text-blue-600
                        ${isSelected ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:text-white' : ''}
                        ${!isSelected && isToday ? 'border border-blue-400 text-blue-600 font-bold' : ''}
                        ${!isSelected && !isToday && isWeekend ? 'text-slate-600 bg-slate-50' : 'text-slate-700'}
                    `}
                >
                    <span className="text-sm leading-none">{day}</span>
                    
                    {/* Task Indicator Dots */}
                    {dayColors.length > 0 && (
                        <div className="absolute bottom-1.5 flex gap-0.5 justify-center items-center max-w-[80%] overflow-hidden h-1.5 px-1">
                             {dayColors.slice(0, 5).map((color, idx) => (
                                 <span 
                                    key={idx} 
                                    className={`w-1.5 h-1.5 rounded-full ${color} ${isSelected ? 'ring-1 ring-white' : ''}`}
                                 ></span>
                             ))}
                             {dayColors.length > 5 && (
                                <span className={`w-0.5 h-0.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-400'}`}></span>
                             )}
                        </div>
                    )}
                </button>
            );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <button 
            onClick={handleToday}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
        >
            今日へ移動
        </button>
        {onCancel && (
            <Button variant="secondary" onClick={onCancel} className="text-sm px-3 py-1">
                キャンセル
            </Button>
        )}
      </div>
    </div>
  );
};
