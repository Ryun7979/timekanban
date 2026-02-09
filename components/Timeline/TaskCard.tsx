
import React from 'react';
import { Task } from '../../types';
import { getColorDef } from '../../utils/colors';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDragStart, onDragEnd }) => {
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  
  // Progress calculation
  let progress = 0;
  if (totalSubtasks > 0) {
    progress = (completedSubtasks / totalSubtasks) * 100;
  }

  // Determine completion status
  const isSubtaskCompleted = totalSubtasks > 0 && completedSubtasks === totalSubtasks;
  const isManualCompleted = totalSubtasks === 0 && (task.isCompleted || false);
  const isAllCompleted = isSubtaskCompleted || isManualCompleted;

  // カラー設定（colors.ts から取得）
  // 既存データには 'bg-blue-500' などのクラス名が入っているため、それをキーに色定義を取得
  const colorDef = getColorDef(task.color);
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
      className={`${colorDef.lightBg} border ${colorDef.border} rounded-md p-2 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group mb-2 relative overflow-hidden select-none`}
    >
      {/* 左端のアクセントカラー（メイン色） */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorDef.value}`}></div>
      
      <div className="pl-2">
        <h4 className={`text-sm font-medium text-slate-800 leading-tight mb-1 truncate ${isAllCompleted ? 'line-through text-slate-500 opacity-80' : ''}`}>{task.title}</h4>
        
        {task.assignee && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="truncate max-w-[120px]">{task.assignee}</span>
            </div>
        )}

        {/* Show progress bar if there are subtasks OR if it is manually completed */}
        {(totalSubtasks > 0 || isManualCompleted) && (
          <div className="mt-2">
             {isAllCompleted ? (
               <div className="flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-400 to-teal-500 text-white py-0.5 px-2 rounded shadow-sm">
                  <span className="text-xs">✨</span>
                  <span className="text-xs font-bold tracking-wide">Ready!</span>
                  <span className="text-xs">✨</span>
               </div>
             ) : (
               <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden border border-black/5">
                     <div 
                       className={`h-full ${colorDef.value} rounded-full transition-all duration-300`}
                       style={{ width: `${progress}%` }}
                     ></div>
                  </div>
                  <span className="text-[10px] text-slate-600 font-medium">{completedSubtasks}/{totalSubtasks}</span>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
