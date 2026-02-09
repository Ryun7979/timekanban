
import React, { useEffect, useRef, useMemo } from 'react';
import { Task, Category, DragGhost, ViewMode, GroupByMode } from '../../types';
import { TaskCard } from './TaskCard';

// Category interface is sufficient for columns ({id, name})
interface TimelineGridProps {
  currentDate: Date;
  columns: Category[]; 
  groupBy: GroupByMode;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCellClick: (dateStr: string, columnId: string) => void;
  onTaskMove: (taskId: string, newDate: string, newColumnId: string) => void;
  onCategoryUpdate: (id: string, name: string) => void;
  onCategoryDelete: (id: string) => void;
  dragGhost: DragGhost | null;
  setDragGhost: (ghost: DragGhost | null) => void;
  viewMode: ViewMode;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  currentDate,
  columns,
  groupBy,
  tasks,
  onTaskClick,
  onCellClick,
  onTaskMove,
  onCategoryUpdate,
  onCategoryDelete,
  dragGhost,
  setDragGhost,
  viewMode
}) => {
  const monthsToShow = viewMode === '1month' ? 1 : viewMode === '3months' ? 3 : 6;
  const startYear = currentDate.getFullYear();
  const startMonth = currentDate.getMonth();
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to get formatted date string YYYY-MM-DD
  const getDateStr = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Scroll to currentDate when it changes
  useEffect(() => {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const targetId = `date-${year}-${month}-${day}`;

      const timer = setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element && containerRef.current) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }, 100);

      return () => clearTimeout(timer);
  }, [currentDate, viewMode]);

  const handleDragOver = (e: React.DragEvent, dateStr: string, columnId: string) => {
    e.preventDefault();
    if (dragGhost?.columnId !== columnId || dragGhost?.date !== dateStr) {
      setDragGhost({ columnId, date: dateStr });
    }
  };

  const handleDrop = (e: React.DragEvent, dateStr: string, columnId: string) => {
    e.preventDefault();
    setDragGhost(null);
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      onTaskMove(taskId, dateStr, columnId);
    }
  };

  // Generate array of month data (Memoized)
  const monthsData = useMemo(() => {
    return Array.from({ length: monthsToShow }, (_, i) => {
      const date = new Date(startYear, startMonth + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      return {
        year,
        month,
        days: Array.from({ length: daysInMonth }, (_, d) => d + 1)
      };
    });
  }, [startYear, startMonth, monthsToShow]);

  return (
    <div className="flex flex-col h-full bg-white shadow-sm border rounded-lg overflow-hidden">
      {/* Header Row (Columns) */}
      <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm">
        <div className="w-16 md:w-24 flex-shrink-0 p-2 border-r border-slate-200 flex flex-col items-center justify-center text-slate-700">
           <div className="flex items-baseline">
             <span className="text-xl md:text-2xl font-bold leading-none">{currentDate.getMonth() + 1}</span>
             <span className="text-xs font-medium ml-0.5">月</span>
           </div>
           <span className="text-[10px] text-slate-400 font-medium">{currentDate.getFullYear()}</span>
        </div>
        {columns.map((col) => {
            // Count ONLY incomplete tasks for this column
            const taskCount = tasks.filter(t => {
                const totalSubtasks = t.subtasks.length;
                const completedSubtasks = t.subtasks.filter(s => s.completed).length;
                
                const isSubtaskCompleted = totalSubtasks > 0 && completedSubtasks === totalSubtasks;
                const isManualCompleted = totalSubtasks === 0 && (t.isCompleted || false);
                const isAllCompleted = isSubtaskCompleted || isManualCompleted;
                if (isAllCompleted) return false;

                if (groupBy === 'category') {
                    return t.categoryId === col.id;
                } else {
                    // Assignee mode
                    const assignee = t.assignee || '';
                    if (col.id === '__unassigned__') return assignee === '';
                    return assignee === col.id;
                }
            }).length;

            return (
                <div key={col.id} className="flex-1 min-w-[200px] p-2 border-r border-slate-200 last:border-r-0 relative group flex items-center justify-center gap-2">
                    {groupBy === 'category' ? (
                        <>
                            <input 
                                type="text"
                                value={col.name}
                                onChange={(e) => onCategoryUpdate(col.id, e.target.value)}
                                className="flex-1 min-w-0 bg-transparent font-semibold text-slate-700 text-center focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 outline-none text-sm"
                            />
                            <button
                                onClick={() => onCategoryDelete(col.id)}
                                className="absolute top-1 right-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="カテゴリを削除"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </>
                    ) : (
                        // Assignee Header (Read-only)
                        <div className="flex-1 text-center font-semibold text-slate-700 text-sm flex items-center justify-center gap-2">
                            {col.id === '__unassigned__' ? (
                                <span className="text-slate-400 italic flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    担当者未設定
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    {col.name}
                                </span>
                            )}
                        </div>
                    )}
                    
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${taskCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200/70 text-slate-500'}`} title="未完了タスク数">
                        {taskCount}
                    </span>
                </div>
            );
        })}
        {columns.length === 0 && (
            <div className="flex-1 p-4 text-center text-slate-400 text-sm italic">
                {groupBy === 'category' ? 'カテゴリがありません。追加してください。' : 'タスクがありません。'}
            </div>
        )}
      </div>

      {/* Grid Body */}
      <div ref={containerRef} className="overflow-y-auto flex-1 custom-scrollbar relative">
        {monthsData.map((monthData, monthIndex) => (
          <React.Fragment key={`${monthData.year}-${monthData.month}`}>
            {/* Month Separator */}
            {viewMode !== '1month' && (
               <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200 p-2 text-sm font-bold text-slate-600 pl-4 shadow-sm">
                  {monthData.year}年 {monthData.month + 1}月
               </div>
            )}

            {monthData.days.map((day) => {
              const dateStr = getDateStr(monthData.year, monthData.month, day);
              const currentDayDate = new Date(monthData.year, monthData.month, day);
              const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;
              const isToday = new Date().toDateString() === currentDayDate.toDateString();

              return (
                <div 
                    key={dateStr} 
                    id={`date-${dateStr}`}
                    className={`flex border-b border-slate-100 min-h-[100px] ${isWeekend ? 'bg-slate-50/50' : 'bg-white'}`}
                >
                  
                  {/* Date Column */}
                  <div className={`w-16 md:w-24 flex-shrink-0 p-2 border-r border-slate-200 flex flex-col items-center justify-center text-slate-500 ${isToday ? 'bg-blue-50 text-blue-600' : ''}`}>
                    <span className="text-xl font-bold leading-none">{day}</span>
                    <span className="text-[10px] uppercase font-medium mt-1">
                      {currentDayDate.toLocaleDateString('ja-JP', { weekday: 'short' })}
                    </span>
                    {isToday && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 rounded-full mt-1">今日</span>}
                  </div>

                  {/* Columns (Lanes) */}
                  {columns.map((col) => {
                    const cellTasks = tasks.filter(t => {
                        if (t.date !== dateStr) return false;
                        if (groupBy === 'category') {
                            return t.categoryId === col.id;
                        } else {
                            const assignee = t.assignee || '';
                            if (col.id === '__unassigned__') return assignee === '';
                            return assignee === col.id;
                        }
                    });
                    const isGhostHere = dragGhost?.columnId === col.id && dragGhost?.date === dateStr;

                    return (
                      <div
                        key={`${dateStr}-${col.id}`}
                        className={`flex-1 min-w-[200px] border-r border-slate-100 last:border-r-0 p-2 relative group transition-colors ${isGhostHere ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                        onDragOver={(e) => handleDragOver(e, dateStr, col.id)}
                        onDrop={(e) => handleDrop(e, dateStr, col.id)}
                        onClick={() => onCellClick(dateStr, col.id)}
                      >
                         <div className="flex flex-col gap-2 h-full">
                            {cellTasks.map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    onClick={onTaskClick}
                                    onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                                    onDragEnd={() => setDragGhost(null)}
                                />
                            ))}
                            {isGhostHere && (
                                <div className="ghost-card rounded-md h-16 w-full flex items-center justify-center text-blue-400 text-xs font-medium animate-pulse">
                                    ここにドロップ
                                </div>
                            )}
                             {/* Empty space click target helper */}
                             <div className="flex-grow min-h-[2rem]"></div>
                         </div>
                      </div>
                    );
                  })}
                  
                  {columns.length === 0 && <div className="flex-1"></div>}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
