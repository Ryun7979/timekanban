import { Task } from '../types';

/**
 * タスクの表示名を計算します。
 * 未完了のサブタスクに担当者が設定されている場合、リストの最初にあるそのサブタスクの担当者を優先します。
 * そうでない場合は、タスクの責任者（assignee）を使用します。
 * どちらも設定されていない場合は undefined を返します。
 * 
 * @param task 
 * @returns 表示名
 */
export const getTaskDisplayName = (task: Partial<Task>): string | undefined => {
    // 1. Check for incomplete subtasks with assignees
    if (task.subtasks && task.subtasks.length > 0) {
        const activeSubtask = task.subtasks.find(s => !s.completed && s.assignee && s.assignee.trim() !== '');
        if (activeSubtask) {
            return activeSubtask.assignee;
        }
    }

    // 2. Fallback to main assignee
    if (task.assignee && task.assignee.trim() !== '') {
        return task.assignee;
    }

    // 3. No display name
    return undefined;
};
