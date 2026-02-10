
import React, { useEffect, useRef, useMemo } from 'react';
import { Task, Category, CalendarEvent, DragGhost, ViewMode, GroupByMode } from '../../types';
import { TaskCard } from './TaskCard';
import { getColorDef } from '../../utils/colors';
import { getTaskDisplayName } from '../../utils/taskUtils';

// Category interface is sufficient for columns ({id, name})
interface TimelineGridProps {
  currentDate: Date;
  columns: Category[];
  groupBy: GroupByMode;
  tasks: Task[];
  events: CalendarEvent[];
  onTaskClick: (task: Task) => void;
  onEventClick: (event: CalendarEvent) => void;
  onCellClick: (dateStr: string, columnId: string) => void;
  onTaskMove: (taskId: string, newDate: string, newColumnId: string) => void;
  onEventDateUpdate: (eventId: string, newStartDate: string, newEndDate: string) => void;
  onCategoryUpdate: (id: string, name: string) => void;
  onCategoryDelete: (id: string) => void;
  onCategoryAdd: () => void;
  dragGhost: DragGhost | null;
  setDragGhost: (ghost: DragGhost | null) => void;
  viewMode: ViewMode;
  isCompactMode?: boolean;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  currentDate,
  columns,
  groupBy,
  tasks,
  events,
  onTaskClick,
  onEventClick,
  onCellClick,
  onTaskMove,
  onEventDateUpdate,
  onCategoryUpdate,
  onCategoryDelete,
  onCategoryAdd,
  dragGhost,
  setDragGhost,
  viewMode,
  isCompactMode = false
}) => {
  // Compression Settings
  const ROW_HEIGHT = 20; // px
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
    if (isCompactMode) return; // Disable drag in compact mode
    if (dragGhost?.columnId !== columnId || dragGhost?.date !== dateStr) {
      setDragGhost({ columnId, date: dateStr });
    }
  };

  const handleDrop = (e: React.DragEvent, dateStr: string, columnId: string) => {
    e.preventDefault();
    setDragGhost(null);
    const taskId = e.dataTransfer.getData("taskId");
    const eventId = e.dataTransfer.getData("eventId");
    const dragType = e.dataTransfer.getData("dragType");
    const dragOriginDate = e.dataTransfer.getData("dragOriginDate");

    if (taskId && columnId !== 'events-column') {
      onTaskMove(taskId, dateStr, columnId);
    } else if (eventId && columnId === 'events-column') {
      // Event Drop
      const event = events.find(ev => ev.id === eventId);
      if (event) {
        const dropDate = new Date(dateStr);
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);

        // Helper format YYYY-MM-DD
        const toDateStr = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        if (dragType === 'move') {
          const duration = endDate.getTime() - startDate.getTime();

          let newStartTimestamp = dropDate.getTime();
          if (dragOriginDate) {
            const origin = new Date(dragOriginDate).getTime();
            const offset = origin - startDate.getTime();
            newStartTimestamp = dropDate.getTime() - offset;
          }

          const newStartDate = new Date(newStartTimestamp);
          const newEndDate = new Date(newStartTimestamp + duration);

          onEventDateUpdate(eventId, toDateStr(newStartDate), toDateStr(newEndDate));
        } else if (dragType === 'resize-start') {
          // Check if dropDate <= endDate
          if (dropDate <= endDate) {
            onEventDateUpdate(eventId, dateStr, event.endDate);
          }
        } else if (dragType === 'resize-end') {
          // Check if dropDate >= startDate
          if (dropDate >= startDate) {
            onEventDateUpdate(eventId, event.startDate, dateStr);
          }
        }
      }
    }
  };

  const handleEventDragStart = (e: React.DragEvent, event: CalendarEvent, type: 'move' | 'resize-start' | 'resize-end', dateStr?: string) => {
    if (isCompactMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("eventId", event.id);
    e.dataTransfer.setData("dragType", type);
    if (dateStr) e.dataTransfer.setData("dragOriginDate", dateStr);
    e.stopPropagation(); // prevent bubbling to cell
  };

  // Calculate event lanes
  const { eventLanes, maxLanes } = useMemo(() => {
    const lanes = new Map<string, number>();
    const sortedEvents = [...events].sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      // Secondary sort by duration (longer first)
      const durA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
      const durB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
      return durB - durA;
    });

    const laneEnds: string[] = []; // Stores the busy-until date for each lane

    sortedEvents.forEach(event => {
      let laneIndex = 0;
      // Find first available lane
      while (true) {
        const busyUntil = laneEnds[laneIndex];
        if (!busyUntil || busyUntil < event.startDate) {
          // Lane is free
          laneEnds[laneIndex] = event.endDate;
          lanes.set(event.id, laneIndex);
          break;
        }
        laneIndex++;
      }
    });

    return { eventLanes: lanes, maxLanes: laneEnds.length };
  }, [events]);

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
      {/* Scrollable Container (Header + Body) */}
      <div ref={containerRef} className="overflow-auto flex-1 custom-scrollbar relative">
        <div className="min-w-full w-max">
          {/* Header Row (Sticky) */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-[4900] shadow-sm min-w-max">
            {/* Sticky Month Column */}
            <div className="w-16 md:w-24 flex-shrink-0 p-2 border-r border-slate-200 flex flex-col items-center justify-center text-slate-700 bg-slate-50 sticky left-0 z-[5000] shadow-[1px_0_0_0_rgba(226,232,240,1)]">
              {monthsToShow > 1 ? (
                <div className="flex flex-col items-center justify-center w-full">
                  <div className="text-xs md:text-sm font-bold text-slate-700 flex items-center justify-center whitespace-nowrap">
                    <span>{monthsData[0].month + 1}</span>
                    <span className="mx-0.5">-</span>
                    <span>{monthsData[monthsToShow - 1].month + 1}</span>
                    <span className="text-[10px] md:text-xs ml-0.5 font-medium">月</span>
                  </div>
                  <div className="text-[9px] md:text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap scale-90 md:scale-100 origin-center">
                    {monthsData[0].year === monthsData[monthsToShow - 1].year
                      ? monthsData[0].year
                      : `${monthsData[0].year}-${monthsData[monthsToShow - 1].year}`}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline">
                    <span className="text-xl md:text-2xl font-bold leading-none">{currentDate.getMonth() + 1}</span>
                    <span className="text-xs font-medium ml-0.5">月</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{currentDate.getFullYear()}</span>
                </>
              )}
            </div>

            {/* Sticky Event Column Header */}
            <div
              className="flex-shrink-0 p-2 border-r border-slate-200 flex items-center justify-center text-slate-700 bg-slate-50 font-semibold text-sm transition-all duration-300 sticky left-16 md:left-24 z-[5000] shadow-[1px_0_0_0_rgba(226,232,240,1)]"
              style={{ width: Math.max(96, (maxLanes * 36) + 16) + 'px' }} // Dynamic width based on lanes (36px per lane)
            >
              {!isCompactMode && "イベント"}
            </div>

            {columns.map((col) => {
              // Count ONLY incomplete tasks for this column
              const taskCount = tasks.filter(t => {
                const totalSubtasks = t.subtasks?.length || 0;
                const completedSubtasks = (t.subtasks || []).filter(s => s.completed).length;

                const isSubtaskCompleted = totalSubtasks > 0 && completedSubtasks === totalSubtasks;
                const isManualCompleted = totalSubtasks === 0 && (t.isCompleted || false);
                const isAllCompleted = isSubtaskCompleted || isManualCompleted;
                if (isAllCompleted) return false;

                if (groupBy === 'category') {
                  return t.categoryId === col.id;
                } else {
                  // Assignee mode (using Display Name)
                  const displayName = getTaskDisplayName(t) || '';
                  if (col.id === '__unassigned__') return displayName === '';
                  return displayName === col.id;
                }
              }).length;

              return (
                <div key={col.id} className={`flex-1 ${isCompactMode ? 'min-w-[40px] p-0' : 'min-w-[200px] p-2'} border-r border-slate-200 last:border-r-0 relative group flex items-center justify-center gap-2 bg-slate-50`}>
                  {groupBy === 'category' ? (
                    <>
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => onCategoryUpdate(col.id, e.target.value)}
                        className={`flex-1 min-w-0 bg-transparent font-semibold text-slate-700 text-center focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 outline-none ${isCompactMode ? 'text-xs' : 'text-sm'}`}
                      />
                      <button
                        onClick={() => onCategoryDelete(col.id)}
                        className="absolute top-1 right-1"
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

            {/* Add Category Button */}
            {groupBy === 'category' && (
              <div className="w-10 flex-shrink-0 border-r border-slate-200 flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer" onClick={onCategoryAdd} title="カテゴリを追加">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            )}

            {columns.length === 0 && groupBy !== 'category' && (
              <div className="flex-1 p-4 text-center text-slate-400 text-sm italic">
                タスクがありません。
              </div>
            )}
          </div>

          {/* Grid Body */}
          {monthsData.map((monthData, monthIdx) => (
            <React.Fragment key={`${monthData.year}-${monthData.month}`}>
              {/* Month Separator */}
              {viewMode !== '1month' && (
                <div className="sticky top-[57px] left-0 z-[5100] bg-slate-100/95 backdrop-blur-sm border-b border-slate-200 p-2 text-sm font-bold text-slate-600 shadow-sm min-w-max">
                  <div className="sticky left-0 px-4 inline-block">
                    {monthData.year}年 {String(monthData.month + 1).padStart(2, '0')}月
                  </div>
                </div>
              )}

              {monthData.days.map((day, dayIdx) => {
                const dateStr = getDateStr(monthData.year, monthData.month, day);
                const currentDayDate = new Date(monthData.year, monthData.month, day);
                const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;
                const isToday = new Date().toDateString() === currentDayDate.toDateString();

                return (
                  <div
                    key={dateStr}
                    id={`date-${dateStr}`}
                    className={`flex border-b border-slate-100 ${isCompactMode ? '' : 'min-h-[100px]'} ${isWeekend ? 'bg-slate-50/50' : 'bg-white'} min-w-max`}
                    style={isCompactMode ? { minHeight: `${ROW_HEIGHT}px` } : undefined}
                  >

                    {/* Date Column (Sticky) */}
                    <div className={`w-16 md:w-24 flex-shrink-0 ${isCompactMode ? 'p-0 justify-center' : 'p-2 justify-center'} border-r border-slate-200 flex flex-col items-center text-slate-500 sticky left-0 z-[700] shadow-[1px_0_0_0_rgba(226,232,240,1)] ${isToday ? 'bg-blue-50 text-blue-600' : (isWeekend ? 'bg-slate-50' : 'bg-white')}`}>
                      <span className={`${isCompactMode ? 'text-[10px] font-medium' : 'text-xl font-bold'} leading-none`}>{day}</span>
                      {!isCompactMode && (
                        <span className="text-[10px] uppercase font-medium mt-1">
                          {currentDayDate.toLocaleDateString('ja-JP', { weekday: 'short' })}
                        </span>
                      )}
                      {isToday && <span className={`text-[9px] bg-blue-100 text-blue-600 px-1.5 rounded-full ${isCompactMode ? 'ml-1' : 'mt-1'}`}>{isCompactMode ? '' : '今日'}</span>}
                    </div>

                    {/* Event Column Cells (Sticky) */}
                    <div
                      className={`flex-shrink-0 border-r border-slate-200 relative group transition-colors sticky left-16 md:left-24 shadow-[1px_0_0_0_rgba(226,232,240,1)] ${isWeekend ? 'bg-slate-50/50' : 'bg-white'} hover:bg-slate-50/80 hover:!z-[4500]`}
                      style={{
                        width: Math.max(96, (maxLanes * 36) + 16) + 'px',
                        /* Dynamic Z-Index:
                           - If has event start (High Priority): Future > Past (400 + idx)
                           - If no event start (Low Priority / Empty): Past > Future (350 - idx)
                             -> This allows past event text to overflow into empty future cells,
                                but be covered by future cells that have events.
                           - Base increased to 3000/4000 to prevent negative values or conflict
                        */
                        zIndex: (() => {
                          const hasEventStart = events.some(e => e.startDate && e.startDate === dateStr);
                          const globalDayIndex = monthIdx * 40 + dayIdx;
                          return hasEventStart ? (4000 + globalDayIndex) : (3000 - globalDayIndex);
                        })()
                      }}
                      onDragOver={(e) => handleDragOver(e, dateStr, 'events-column')}
                      onDrop={(e) => handleDrop(e, dateStr, 'events-column')}
                    >
                      {/* Set background solid to prevent transparency issues when scrolling */}
                      <div className={`absolute inset-0 ${isWeekend ? 'bg-slate-50' : 'bg-white'} -z-10`} />

                      <div className="w-full h-full relative">
                        {/* Render events sorted by date (Past -> Future) so Future events are on top */}
                        {[...events]
                          .filter(e => e.startDate && e.endDate && e.startDate <= e.endDate)
                          .sort((a, b) => {
                            if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
                            // Secondary sort: Later end date = Higher priority (Rendered on top)
                            return a.endDate.localeCompare(b.endDate);
                          }).map(event => {
                            if (event.startDate <= dateStr && dateStr <= event.endDate) {
                              const isStart = event.startDate === dateStr;
                              const isEnd = event.endDate === dateStr;
                              const colorDef = getColorDef(event.color);
                              const laneIndex = eventLanes.get(event.id) || 0;

                              // Horizontal position based on lane (36px width)
                              const leftOffset = laneIndex * 36 + 8; // 36px per lane + 8px padding

                              return (
                                <div
                                  key={event.id}
                                  className={`absolute top-0 bottom-0 flex flex-col items-center group/event z-10`}
                                  style={{ left: `${leftOffset}px`, width: '12px' }}
                                >
                                  {/* Line Segment */}
                                  <div
                                    className={`w-1.5 h-full rounded-full ${colorDef.value} opacity-80 ${isCompactMode ? '' : 'cursor-move hover:w-2 hover:opacity-100'} relative transition-all`}
                                    draggable={!isCompactMode}
                                    onDragStart={(e) => handleEventDragStart(e, event, 'move', dateStr)}
                                    onClick={(e) => { e.stopPropagation(); if (!isCompactMode) onEventClick(event); }}
                                  >
                                    {!isCompactMode && isStart && (
                                      <div
                                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full cursor-n-resize hover:bg-blue-100 z-20"
                                        draggable
                                        onDragStart={(e) => handleEventDragStart(e, event, 'resize-start')}
                                        onClick={(e) => e.stopPropagation()}
                                      ></div>
                                    )}
                                    {!isCompactMode && isEnd && (
                                      <div
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full cursor-s-resize hover:bg-blue-100 z-20"
                                        draggable
                                        onDragStart={(e) => handleEventDragStart(e, event, 'resize-end')}
                                        onClick={(e) => e.stopPropagation()}
                                      ></div>
                                    )}
                                  </div>

                                  {/* Label (Vertical writing mode) */}
                                  {!isCompactMode && (isStart || (day === 1 && event.startDate < dateStr)) && (
                                    <div
                                      className={`absolute left-3 top-0 z-30 whitespace-nowrap text-xs font-bold text-slate-700 px-0.5 py-1.5 rounded shadow-sm border border-slate-100 pointer-events-none ${colorDef.lightBg} bg-opacity-90`}
                                      style={{ writingMode: 'vertical-rl' }}
                                    >
                                      {event.title}
                                    </div>
                                  )}

                                  {/* Custom Tooltip (Zero lag) */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/event:block z-[9999] whitespace-pre bg-slate-800 text-white text-base px-3 py-2 rounded shadow-lg pointer-events-none w-max max-w-[300px] leading-snug">
                                    {`${event.title}\n(${event.startDate} ~ ${event.endDate})`}
                                    {/* Triangle Pointer */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                      </div>
                    </div>

                    {/* Columns (Lanes) */}
                    {
                      columns.map((col) => {
                        const cellTasks = tasks.filter(t => {
                          if (t.date !== dateStr) return false;
                          if (groupBy === 'category') {
                            return t.categoryId === col.id;
                          } else {
                            // Assignee mode (using Display Name)
                            const displayName = getTaskDisplayName(t) || '';
                            if (col.id === '__unassigned__') return displayName === '';
                            return displayName === col.id;
                          }
                        });
                        const isGhostHere = dragGhost?.columnId === col.id && dragGhost?.date === dateStr;

                        return (
                          <div
                            key={`${dateStr}-${col.id}`}
                            className={`flex-1 ${isCompactMode ? 'min-w-[40px] p-0' : 'min-w-[200px] p-2'} border-r border-slate-100 last:border-r-0 relative group transition-colors ${isGhostHere ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                            onDragOver={(e) => handleDragOver(e, dateStr, col.id)}
                            onDrop={(e) => handleDrop(e, dateStr, col.id)}
                            onClick={() => onCellClick(dateStr, col.id)}
                          >
                            <div className={`flex flex-col h-full w-full ${isCompactMode ? 'gap-0.5 px-0.5' : 'gap-2'}`}>
                              {cellTasks.map(task => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onClick={(t) => !isCompactMode && onTaskClick(t)}
                                  onDragStart={(e) => {
                                    if (isCompactMode) {
                                      e.preventDefault();
                                      return;
                                    }
                                    e.dataTransfer.setData("taskId", task.id)
                                  }}
                                  onDragEnd={() => setDragGhost(null)}
                                  isCompact={isCompactMode}
                                />
                              ))}
                              {isGhostHere && (
                                <div className="ghost-card rounded-md h-16 w-full flex items-center justify-center text-blue-400 text-xs font-medium animate-pulse">
                                  ここにドロップ
                                </div>
                              )}
                              {/* Empty space click target helper */}
                              <div className={`flex-grow ${isCompactMode ? 'min-h-[10px]' : 'min-h-[2rem]'}`}></div>
                            </div>
                          </div>
                        );
                      })
                    }

                    {columns.length === 0 && <div className="flex-1"></div>}

                    {/* Spacer to align with Header's Add Category Button */}
                    {groupBy === 'category' && <div className="w-10 flex-shrink-0 border-l border-slate-100 bg-slate-50/30"></div>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div >
  );
};
