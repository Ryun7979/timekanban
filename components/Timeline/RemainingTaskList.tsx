import React, { useMemo } from 'react';
import { Task, Category } from '../../types';
import { getTaskDisplayName } from '../../utils/taskUtils';
import { getColorDef } from '../../utils/colors';

interface RemainingTaskListProps {
    tasks: Task[];
    categories: Category[];
    onDateSelect?: (dateStr: string) => void;
}

export const RemainingTaskList: React.FC<RemainingTaskListProps> = ({ tasks, categories, onDateSelect }) => {
    // 完了していないタスクを抽出し、日付順にソート
    const remainingTasks = useMemo(() => {
        return tasks.filter(task => {
            // 親タスクが完了済みとしてマークされている場合は除外
            if (task.isCompleted) return false;

            // サブタスクがある場合、すべてのサブタスクが完了していれば除外
            if (task.subtasks && task.subtasks.length > 0) {
                return !task.subtasks.every(s => s.completed);
            }

            // サブタスクがなく、完了マークもなければ表示
            return true;
        }).sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.title.localeCompare(b.title);
        });
    }, [tasks]);

    const handleTaskClick = (task: Task) => {
        const element = document.getElementById(`task-card-${task.id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            // ハイライトエフェクトなどを追加しても良いかもしれない
            element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
            }, 2000);
        } else {
            if (onDateSelect) {
                onDateSelect(task.date);
            }
        }
    };

    const getCategoryName = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.name || '未分類';
    };

    if (remainingTasks.length === 0) {
        return (
            <div className="p-4 text-center text-slate-400 text-sm">
                残タスクはありません 🎉
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <div className="p-3 border-b border-slate-100 font-bold text-slate-500 flex items-center gap-2 bg-slate-50/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                残タスク一覧
                <span className="ml-auto text-xs font-normal bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {remainingTasks.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {remainingTasks.map(task => {
                    const colorDef = getColorDef(task.color);
                    const displayName = getTaskDisplayName(task);
                    const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
                    const totalSubtasks = task.subtasks?.length || 0;

                    // 期限チェック
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const taskDate = new Date(task.date);
                    taskDate.setHours(0, 0, 0, 0);
                    const diffTime = taskDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    let alertIcon = null;
                    if (diffDays < 0) {
                        alertIcon = (
                            <span className="text-[10px] text-red-500 font-bold bg-red-100 px-1 rounded ml-1 flex items-center" title="期限切れ">
                                !
                            </span>
                        );
                    } else if (diffDays >= 0 && diffDays <= 2) {
                        alertIcon = (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1 rounded ml-1 flex items-center" title="期限間近">
                                ⚠
                            </span>
                        );
                    }

                    return (
                        <div
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className={`group p-1.5 rounded-md border ${diffDays < 0 ? 'border-red-200' : 'border-slate-100'} hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all shadow-sm hover:shadow-md relative overflow-hidden`}
                        >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorDef.value}`}></div>

                            <div className="pl-2">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 rounded truncate max-w-[120px]">
                                        {getCategoryName(task.categoryId)}
                                    </span>
                                    <div className="flex items-center">
                                        <span className={`text-[10px] font-medium whitespace-nowrap ml-2 ${diffDays < 0 ? 'text-red-500 font-bold' : diffDays <= 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                                            {task.date}
                                        </span>
                                        {alertIcon}
                                    </div>
                                </div>

                                <h4 className="text-sm font-medium text-slate-700 leading-tight mb-0.5 line-clamp-1 group-hover:text-blue-700 transition-colors">
                                    {task.title}
                                </h4>

                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                    <div className="flex items-center gap-1 overflow-hidden" title={displayName}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-70 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        <span className="truncate max-w-[100px]">{displayName || '未設定'}</span>
                                    </div>

                                    {totalSubtasks > 0 && (
                                        <div className="flex items-center gap-1 bg-slate-100 px-1.5 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-[10px] font-medium">{completedSubtasks}/{totalSubtasks}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
