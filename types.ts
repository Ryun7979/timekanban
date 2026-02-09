

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  date: string; // ISO Date string YYYY-MM-DD. Constraints: startDate === endDate
  subtasks: Subtask[];
  color?: string;
  assignee?: string;
  isCompleted?: boolean; // Manually marked as completed (mainly for tasks without subtasks)
}

export interface Category {
  id: string;
  name: string;
}

export interface DragGhost {
  columnId: string;
  date: string;
}

export type DialogType = 'alert' | 'confirm' | 'prompt' | 'task-form' | 'settings' | 'calendar';

export interface DialogOptions {
  title?: string;
  message?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  task?: Task; // For task form
  defaultText?: string; // For prompt
  inputType?: string; // For prompt input type (text, date, etc.)
  // For settings
  currentAppName?: string;
  currentAppIcon?: string;
  currentFileName?: string; // Added: Display current file name
  onSettingsSave?: (name: string, icon: string) => void;
  onResetData?: () => void; // Callback for data reset
  // For calendar picker
  tasks?: Task[];
}

export type ViewMode = '1month' | '3months' | '6months';
export type GroupByMode = 'category' | 'assignee';