import React from 'react';
import { Category, CalendarEvent, DragGhost, GroupByMode, Task } from '../../types';
import { getColorDef } from '../../utils/colors';
import { getTaskDisplayName } from '../../utils/taskUtils';
import { TaskCard } from './TaskCard';

interface TimelineRowProps {
    dateStr: string;
    day: number;
    currentDayDate: Date;
    isWeekend: boolean;
    isToday: boolean;
    isCompactMode: boolean;
    ROW_HEIGHT: number;
    events: CalendarEvent[];
    maxLanes: number;
    eventLanes: Map<string, number>;
    columns: Category[];
    groupBy: GroupByMode;
    tasks: Task[];
    dragGhost: DragGhost | null;

    onDragOver: (e: React.DragEvent, dateStr: string, columnId: string) => void;
    onDrop: (e: React.DragEvent, dateStr: string, columnId: string) => void;
    onCellClick: (dateStr: string, columnId: string) => void;
    onTaskClick: (task: Task) => void;
    onTaskDragStart: (e: React.DragEvent, task: Task) => void;
    onTaskDragEnd: () => void;

    onEventDragStart: (e: React.DragEvent, event: CalendarEvent, type: 'move' | 'resize-start' | 'resize-end', dateStr?: string) => void;
    onEventClick: (event: CalendarEvent) => void;

    monthIdx: number;
    dayIdx: number;
}

export const TimelineRow: React.FC<TimelineRowProps> = React.memo(({
    dateStr, day, currentDayDate, isWeekend, isToday, isCompactMode, ROW_HEIGHT,
    events, maxLanes, eventLanes, columns, groupBy, tasks, dragGhost,
    onDragOver, onDrop, onCellClick, onTaskClick, onTaskDragStart, onTaskDragEnd,
    onEventDragStart, onEventClick, monthIdx, dayIdx
}) => {
    return (
        <div
            id={`date-${dateStr}`}
            className={`flex border-b border-slate-100 ${isCompactMode ? '' : 'min-h-[40px]'} ${isWeekend ? 'bg-slate-50/50' : 'bg-white'} min-w-max`}
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
                    zIndex: (() => {
                        const hasEventStart = events.some(e => e.startDate && e.startDate === dateStr);
                        const globalDayIndex = monthIdx * 40 + dayIdx;
                        return hasEventStart ? (4000 + globalDayIndex) : (3000 - globalDayIndex);
                    })()
                }}
                onDragOver={(e) => onDragOver(e, dateStr, 'events-column')}
                onDrop={(e) => onDrop(e, dateStr, 'events-column')}
            >
                <div className={`absolute inset-0 ${isWeekend ? 'bg-slate-50' : 'bg-white'} -z-10`} />

                <div className="w-full h-full relative">
                    {[...events]
                        .filter(e => e.startDate && e.endDate && e.startDate <= e.endDate)
                        .sort((a, b) => {
                            if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
                            return a.endDate.localeCompare(b.endDate);
                        }).map(event => {
                            if (event.startDate <= dateStr && dateStr <= event.endDate) {
                                const isStart = event.startDate === dateStr;
                                const isEnd = event.endDate === dateStr;
                                const colorDef = getColorDef(event.color);
                                const laneIndex = eventLanes.get(event.id) || 0;
                                const leftOffset = laneIndex * 36 + 8;

                                return (
                                    <div
                                        key={event.id}
                                        className={`absolute top-0 bottom-0 flex flex-col items-center group/event z-10`}
                                        style={{ left: `${leftOffset}px`, width: '12px' }}
                                    >
                                        <div
                                            className={`w-1.5 h-full rounded-full ${colorDef.value} opacity-80 ${isCompactMode ? '' : 'cursor-move hover:w-2 hover:opacity-100'} relative transition-all`}
                                            draggable={!isCompactMode}
                                            onDragStart={(e) => onEventDragStart(e, event, 'move', dateStr)}
                                            onClick={(e) => { e.stopPropagation(); if (!isCompactMode) onEventClick(event); }}
                                        >
                                            {!isCompactMode && isStart && (
                                                <div
                                                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full cursor-n-resize hover:bg-blue-100 z-20"
                                                    draggable
                                                    onDragStart={(e) => onEventDragStart(e, event, 'resize-start')}
                                                    onClick={(e) => e.stopPropagation()}
                                                ></div>
                                            )}
                                            {!isCompactMode && isEnd && (
                                                <div
                                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full cursor-s-resize hover:bg-blue-100 z-20"
                                                    draggable
                                                    onDragStart={(e) => onEventDragStart(e, event, 'resize-end')}
                                                    onClick={(e) => e.stopPropagation()}
                                                ></div>
                                            )}
                                        </div>

                                        {!isCompactMode && (isStart || (day === 1 && event.startDate < dateStr)) && (
                                            <div
                                                className={`absolute left-3 top-0 z-30 whitespace-nowrap text-xs font-bold text-slate-700 px-0.5 py-1.5 rounded shadow-sm border border-slate-100 pointer-events-none ${colorDef.lightBg} bg-opacity-90`}
                                                style={{ writingMode: 'vertical-rl' }}
                                            >
                                                {event.title}
                                            </div>
                                        )}

                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/event:block z-[9999] whitespace-pre bg-slate-800 text-white text-base px-3 py-2 rounded shadow-lg pointer-events-none w-max max-w-[300px] leading-snug">
                                            {`${event.title}\n(${event.startDate} ~ ${event.endDate})`}
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
                    // Filter tasks passed from parent (optimized) or filter here
                    const cellTasks = tasks.filter(t => {
                        if (t.date !== dateStr) return false;
                        if (groupBy === 'category') {
                            return t.categoryId === col.id;
                        } else {
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
                            onDragOver={(e) => onDragOver(e, dateStr, col.id)}
                            onDrop={(e) => onDrop(e, dateStr, col.id)}
                            onClick={() => onCellClick(dateStr, col.id)}
                        >
                            <div className={`flex flex-col w-full ${isCompactMode ? 'gap-0.5 px-0.5' : 'gap-1'}`}>
                                {cellTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        id={'task-card-' + task.id}
                                        task={task}
                                        onClick={() => !isCompactMode && onTaskClick(task)}
                                        onDragStart={onTaskDragStart}
                                        onDragEnd={onTaskDragEnd}
                                        isCompact={isCompactMode}
                                    />
                                ))}
                                {isGhostHere && (
                                    <div className="ghost-card rounded-md h-16 w-full flex items-center justify-center text-blue-400 text-xs font-medium animate-pulse">
                                        ここにドロップ
                                    </div>
                                )}
                                <div className={`${isCompactMode ? 'h-[4px]' : 'h-[8px]'} flex-none`}></div>
                            </div>
                        </div>
                    );
                })
            }

            {columns.length === 0 && <div className="flex-1"></div>}

            {groupBy === 'category' && <div className="w-10 flex-shrink-0 border-l border-slate-100 bg-slate-50/30"></div>}
        </div>
    );
});
