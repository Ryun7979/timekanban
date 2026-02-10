import React from 'react';
import { Category, GroupByMode, Task } from '../../types';
import { getTaskDisplayName } from '../../utils/taskUtils';

interface TimelineHeaderProps {
    monthsToShow: number;
    monthsData: { year: number; month: number; days: number[] }[];
    currentDate: Date;
    isCompactMode: boolean;
    maxLanes: number;
    columns: Category[];
    groupBy: GroupByMode;
    tasks: Task[];
    onCategoryUpdate: (id: string, name: string) => void;
    onCategoryDelete: (id: string) => void;
    onCategoryAdd: () => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    monthsToShow,
    monthsData,
    currentDate,
    isCompactMode,
    maxLanes,
    columns,
    groupBy,
    tasks,
    onCategoryUpdate,
    onCategoryDelete,
    onCategoryAdd
}) => {
    return (
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
                style={{ width: Math.max(96, (maxLanes * 36) + 16) + 'px' }}
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
    );
};
