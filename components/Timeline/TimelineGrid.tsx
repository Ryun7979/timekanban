import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Task, Category, CalendarEvent, ViewMode, GroupByMode, DragGhost } from '../../types';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRow } from './TimelineRow';

interface TimelineGridProps {
  tasks: Task[];
  columns: Category[];
  currentDate: Date;
  viewMode: ViewMode;
  groupBy: GroupByMode;
  events: CalendarEvent[];
  onTaskClick: (task: Task) => void;
  onEventClick: (event: CalendarEvent) => void;
  onCellClick: (dateStr: string, columnId: string) => void;
  onTaskMove: (taskId: string, newDate: string, newColumnId: string) => void;
  onEventDateUpdate: (eventId: string, newStartDate: string, newEndDate: string) => void;
  onCategoryAdd: () => void;
  onCategoryUpdate: (id: string, name: string) => void;
  onCategoryDelete: (id: string) => void;
  setDragGhost: (ghost: DragGhost | null) => void;
  dragGhost: DragGhost | null;
  isCompactMode: boolean;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  tasks,
  columns,
  currentDate,
  viewMode,
  groupBy,
  events,
  onTaskClick,
  onEventClick,
  onCellClick,
  onTaskMove,
  onEventDateUpdate,
  onCategoryAdd,
  onCategoryUpdate,
  onCategoryDelete,
  setDragGhost,
  dragGhost,
  isCompactMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const monthsToShow = viewMode === '1month' ? 1 : viewMode === '3months' ? 3 : 6;
  const ROW_HEIGHT = isCompactMode ? 12 : 48;

  // Start Date Calculation
  const startDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(1);
    return d;
  }, [currentDate]);

  // Months Data Calculation
  const monthsData = useMemo(() => {
    const data = [];
    for (let i = 0; i < monthsToShow; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, j) => j + 1);
      data.push({ year, month, days });
    }
    return data;
  }, [startDate, monthsToShow]);

  // Event Lanes Calculation
  const { eventLanes, maxLanes } = useMemo(() => {
    const lanes = new Map<string, number>();
    const sortedEvents = [...events].filter(e => e.startDate && e.endDate).sort((a, b) => {
      // Sort by start date first
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      // Then by duration (longer first)
      const durA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
      const durB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
      return durB - durA;
    });

    const laneEnds: string[] = []; // Stores the end date of the last event in each lane

    sortedEvents.forEach(event => {
      let laneIndex = 0;
      while (true) {
        const busyUntil = laneEnds[laneIndex];
        // If lane is empty or this event starts after the last one ends
        if (!busyUntil || busyUntil < event.startDate) {
          laneEnds[laneIndex] = event.endDate;
          lanes.set(event.id, laneIndex);
          break;
        }
        laneIndex++;
      }
    });

    return { eventLanes: lanes, maxLanes: laneEnds.length };
  }, [events]);

  // Helper for date formatting
  const getDateStr = useCallback((year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, []);

  // --- Auto Scroll to currentDate ---
  useEffect(() => {
    if (!currentDate) return;

    // Set a small timeout to ensure DOM is ready after potential month change
    const timer = setTimeout(() => {
      const dateStr = currentDate.toISOString().split('T')[0];
      const element = document.getElementById(`date-${dateStr}`);
      const scrollContainer = document.getElementById('timeline-scroll-container');

      if (element && scrollContainer) {
        // Calculate offset to center the date or show it clearly
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Only scroll if it's outside or partially outside the viewport
        const isVisible = (
          elementRect.top >= containerRect.top &&
          elementRect.bottom <= containerRect.bottom
        );

        if (!isVisible) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentDate]);

  // --- Handlers ---

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragGhost || dragGhost.date !== dateStr || dragGhost.columnId !== columnId) {
      setDragGhost({ date: dateStr, columnId });
    }
  }, [dragGhost, setDragGhost]);

  // Task Drag Start
  const onTaskDragStart = useCallback((e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
    // Create drag image if needed, or let browser handle it
  }, []);

  const onTaskDragEnd = useCallback(() => {
    setDragGhost(null);
  }, [setDragGhost]);

  // Event Dragging Logic needs state ref because standard DnD API ...
  // Wait, I stripped handleEventDragStart logic in TimelineRow?
  // No, TimelineRow passes `onEventDragStart` up.
  // I need to implement `onEventDragStart` here which sets `eventDragState` ref.

  const eventDragState = useRef<{
    eventId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    initialDate?: string;
    originalStart?: string;
    originalEnd?: string;
  } | null>(null);

  const handleEventDragStart = useCallback((e: React.DragEvent, event: CalendarEvent, type: 'move' | 'resize-start' | 'resize-end', dateStr?: string) => {
    eventDragState.current = {
      eventId: event.id,
      type,
      initialDate: dateStr, // For validation if needed
      originalStart: event.startDate,
      originalEnd: event.endDate
    };
    e.dataTransfer.setData('text/event-id', event.id);
    e.dataTransfer.effectAllowed = 'move';

    // Hide default ghost for resize?
    if (type !== 'move') {
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(img, 0, 0);
    }
  }, []);

  // Modify handleDrop to support events
  const handleDropWithEvents = useCallback((e: React.DragEvent, dateStr: string, columnId: string) => {
    e.preventDefault();
    setDragGhost(null);

    const taskId = e.dataTransfer.getData('text/task-id');
    if (taskId) {
      onTaskMove(taskId, dateStr, columnId);
      return;
    }

    const eventId = e.dataTransfer.getData('text/event-id');
    const dragInfo = eventDragState.current;

    if (eventId && dragInfo && dragInfo.eventId === eventId) {
      const event = events.find(ev => ev.id === eventId);
      if (!event) return;

      if (dragInfo.type === 'move') {
        const duration = (new Date(event.endDate).getTime() - new Date(event.startDate).getTime());
        const newStart = new Date(dateStr);
        const newEnd = new Date(newStart.getTime() + duration);

        onEventDateUpdate(
          eventId,
          newStart.toISOString().split('T')[0],
          newEnd.toISOString().split('T')[0]
        );
      } else if (dragInfo.type === 'resize-start') {
        if (dateStr > event.endDate) return; // Prevention
        onEventDateUpdate(eventId, dateStr, event.endDate);
      } else if (dragInfo.type === 'resize-end') {
        if (dateStr < event.startDate) return;
        onEventDateUpdate(eventId, event.startDate, dateStr);
      }

      eventDragState.current = null;
    }
  }, [setDragGhost, onTaskMove, events, onEventDateUpdate]);



  return (
    <div className="flex flex-col h-full relative" ref={containerRef}>
      <div className="flex-1 overflow-auto custom-scrollbar relative" id="timeline-scroll-container">
        <div className="min-w-max">
          <TimelineHeader
            monthsToShow={monthsToShow}
            monthsData={monthsData}
            currentDate={startDate}
            isCompactMode={isCompactMode}
            maxLanes={maxLanes}
            columns={columns}
            groupBy={groupBy}
            tasks={tasks}
            onCategoryUpdate={onCategoryUpdate}
            onCategoryDelete={onCategoryDelete}
            onCategoryAdd={onCategoryAdd}
          />
          {monthsData.map((m, mIdx) => (
            <div key={`${m.year}-${m.month}`}>
              {m.days.map((d, dIdx) => {
                const dateStr = getDateStr(m.year, m.month, d);
                const dateObj = new Date(m.year, m.month, d);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const isToday = dateStr === new Date().toISOString().split('T')[0];

                return (
                  <React.Fragment key={dateStr}>
                    {d === 1 && (
                      <div className="flex bg-slate-100/80 backdrop-blur-sm border-y border-slate-200 sticky left-0 z-[800] py-1 px-4 shadow-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase">{m.year}</span>
                          <span className="text-sm font-black text-slate-700">{m.month + 1}月</span>
                        </div>
                      </div>
                    )}
                    <TimelineRow
                      dateStr={dateStr}
                      day={d}
                      currentDayDate={dateObj}
                      isWeekend={isWeekend}
                      isToday={isToday}
                      isCompactMode={isCompactMode}
                      ROW_HEIGHT={ROW_HEIGHT}
                      events={events}
                      maxLanes={maxLanes}
                      eventLanes={eventLanes}
                      columns={columns}
                      groupBy={groupBy}
                      tasks={tasks}
                      dragGhost={dragGhost}
                      onDragOver={handleDragOver}
                      onDrop={handleDropWithEvents}
                      onCellClick={onCellClick}
                      onTaskClick={onTaskClick}
                      onTaskDragStart={onTaskDragStart}
                      onTaskDragEnd={onTaskDragEnd}
                      onEventDragStart={handleEventDragStart}
                      onEventClick={onEventClick}
                      monthIdx={mIdx}
                      dayIdx={dIdx}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
