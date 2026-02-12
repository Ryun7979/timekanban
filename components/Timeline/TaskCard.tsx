import React from 'react';
import { Task } from '../../types';
import { getColorDef } from '../../utils/colors';
import { getTaskDisplayName } from '../../utils/taskUtils';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd?: () => void;
  isCompact?: boolean;
  id?: string;
}

export const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, onClick, onDragStart, onDragEnd, isCompact = false, id }) => {
  const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length;
  const totalSubtasks = task.subtasks?.length || 0;

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
  const colorDef = getColorDef(task.color);

  if (isCompact) {
    const displayName = getTaskDisplayName(task);
    const subtaskStatus = (task.subtasks?.length || 0) > 0
      ? `(${task.subtasks?.filter(s => s.completed).length}/${task.subtasks?.length})`
      : '';
    const tooltip = `${task.title} ${subtaskStatus}\n日付: ${task.date}\n担当: ${displayName || '未設定'}`;

    return (
      <div id={id} className="relative group/task w-full flex-shrink-0" style={{ marginBottom: '0.33px' }}>
        <div
          className={`${colorDef.value} rounded-sm hover:opacity-100 transition-opacity w-full`}
          style={{ height: '6px' }}
        ></div>
        {/* Custom Tooltip (Zero lag) */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/task:block z-[9999] whitespace-pre bg-slate-800 text-white text-base px-3 py-2 rounded shadow-lg pointer-events-none w-max max-w-[300px] leading-snug">
          {tooltip}
          {/* Triangle Pointer */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
      id={id}
      className={`${colorDef.lightBg} border ${colorDef.border} rounded-md p-2 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group mb-1 relative overflow-hidden select-none`}
    >
      {/* 左端のアクセントカラー（メイン色） */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorDef.value}`}></div>

      <div className="pl-2">
        <h4 className={`text-sm font-medium text-slate-800 leading-tight mb-1 truncate ${isAllCompleted ? 'line-through text-slate-500 opacity-80' : ''}`}>{task.title}</h4>

        {(() => {
          const displayName = getTaskDisplayName(task);
          const responsible = task.assignee;

          if (!displayName) return null;

          return (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-70 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <div className="flex items-baseline gap-1 overflow-hidden">
                <span className="truncate font-medium text-slate-700">{displayName}</span>
                {responsible && responsible !== displayName && (
                  <span className="text-[10px] text-slate-400 truncate flex-shrink-0">
                    (責任者: {responsible})
                  </span>
                )}
              </div>
            </div>
          );
        })()}

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
});
