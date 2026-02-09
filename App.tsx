
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, Category, DialogType, DialogOptions, DragGhost, ViewMode, GroupByMode } from './types';
import { TimelineGrid } from './components/Timeline/TimelineGrid';
import { Dialog } from './components/UI/Dialog';
import { TaskForm } from './components/TaskForm';
import { Button } from './components/UI/Button';
import { CalendarPicker } from './components/UI/CalendarPicker';
import { PromptForm } from './components/UI/PromptForm';
import { SettingsForm } from './components/SettingsForm';
import { APP_ICONS } from './utils/icons';

// Initial Data
const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: 'カテゴリ１' },
  { id: 'c2', name: 'カテゴリ２' },
];

const INITIAL_TASKS: Task[] = [];

const DEFAULT_APP_NAME = "まだ決まってない予定";
const DEFAULT_APP_ICON = "kanban";

const App: React.FC = () => {
  // --- State ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('kanban-tasks');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch (e) {
      console.error("Failed to load tasks from localStorage", e);
      return INITIAL_TASKS;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('kanban-categories');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch (e) {
      console.error("Failed to load categories from localStorage", e);
      return INITIAL_CATEGORIES;
    }
  });

  const [appName, setAppName] = useState(() => {
    return localStorage.getItem('kanban-app-name') || DEFAULT_APP_NAME;
  });

  const [appIcon, setAppIcon] = useState(() => {
    return localStorage.getItem('kanban-app-icon') || DEFAULT_APP_ICON;
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('1month');
  const [groupBy, setGroupBy] = useState<GroupByMode>('category');

  // File System Handle for Quick Save
  // Note: Using 'any' because FileSystemFileHandle types might not be globally available in all TS environments
  const [currentFileHandle, setCurrentFileHandle] = useState<any>(null);

  // Drag & Drop (Task)
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);

  // Drag & Drop (File Import)
  const [isDragFileOver, setIsDragFileOver] = useState(false);
  const dragCounter = useRef(0);

  // Modal System
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('alert');
  const [dialogProps, setDialogProps] = useState<DialogOptions>({});

  // File Import Ref (Fallback)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects for Persistence ---
  useEffect(() => {
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('kanban-categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('kanban-app-name', appName);
  }, [appName]);

  useEffect(() => {
    localStorage.setItem('kanban-app-icon', appIcon);
  }, [appIcon]);

  // --- Helpers ---
  const openDialog = (type: DialogType, options: DialogOptions = {}) => {
    setDialogType(type);
    setDialogProps(options);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogProps({});
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    // 常に1ヶ月ずつ移動する
    const monthsToAdd = 1;
    const factor = direction === 'next' ? 1 : -1;
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (monthsToAdd * factor));
    setCurrentDate(newDate);
  };

  // --- Computed Columns ---
  const timelineColumns = useMemo(() => {
    if (groupBy === 'category') {
      return categories;
    } else {
      // Extract unique assignees
      const distinctAssignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[];
      // Sort alphabetically
      distinctAssignees.sort();

      const assigneeColumns = distinctAssignees.map(a => ({ id: a, name: a }));

      // Add "Unassigned" column at the beginning
      return [{ id: '__unassigned__', name: '担当者未設定' }, ...assigneeColumns];
    }
  }, [groupBy, categories, tasks]);

  // --- Import / Export Handlers ---

  const getExportData = () => {
    return {
      meta: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
      },
      appName,
      appIcon,
      categories,
      tasks
    };
  };

  const handleExport = () => {
    try {
      const data = getExportData();

      let jsonString: string;
      try {
        jsonString = JSON.stringify(data, null, 2);
      } catch (e) {
        throw new Error("データのJSON変換に失敗しました。");
      }

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const h = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${y}-${m}-${d}_${h}-${min}-${s}`;

      const safeAppName = appName ? appName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') : 'backup';

      a.download = `${safeAppName}_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Export Error:", error);
      openDialog('alert', {
        title: 'エクスポートエラー',
        message: `データの保存中にエラーが発生しました。\n${error.message || '不明なエラー'}`
      });
    }
  };

  const handleQuickSave = async () => {
    if (!currentFileHandle) {
      // Fallback to "Save As" if no file is linked
      handleExport();
      return;
    }

    try {
      const data = getExportData();
      const jsonString = JSON.stringify(data, null, 2);

      // Create a writable stream to the file
      const writable = await currentFileHandle.createWritable();
      // Write the contents
      await writable.write(jsonString);
      // Close the file
      await writable.close();

      // Optional: show success toast here if desired.
      console.log("File saved successfully.");

    } catch (error: any) {
      console.error("Quick Save Error:", error);

      // Handle specific errors
      let message = `ファイルの保存中にエラーが発生しました。\n${error.message || '不明なエラー'}`;
      let isSecurityError = false;

      // Check for common permission/security errors in iframes
      if (error.name === 'NotAllowedError' || error.message.includes('Not allowed to request permissions') || error.name === 'SecurityError') {
        message = "この環境（プレビュー画面等）では、ブラウザのセキュリティ制限によりファイルへの直接書き込みが許可されていません。";
        isSecurityError = true;
      } else if (error.name === 'NotFoundError') {
        message = "保存先のファイルが見つかりません。移動または削除された可能性があります。";
        setCurrentFileHandle(null); // Reset handle
      }

      if (isSecurityError) {
        openDialog('confirm', {
          title: '上書き保存できません',
          message: `${message}\n\n代わりにファイルをダウンロード（名前を付けて保存）しますか？`,
          onConfirm: () => {
            handleExport();
            closeDialog();
          }
        });
      } else {
        openDialog('alert', {
          title: '保存エラー',
          message: message
        });
      }
    }
  };

  const importDataFromFile = (file: File, fileHandle: any = null) => {
    if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
      openDialog('alert', { title: 'エラー', message: 'JSONファイルを選択してください。' });
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = event.target?.result;
        if (typeof json !== 'string') {
          throw new Error("ファイルの読み込み結果が不正です。");
        }

        const data = JSON.parse(json);

        if (!data || typeof data !== 'object') {
          throw new Error("データ形式が無効です。");
        }

        const missingFields = [];
        if (!Array.isArray(data.categories)) missingFields.push("categories");
        if (!Array.isArray(data.tasks)) missingFields.push("tasks");

        if (missingFields.length > 0) {
          throw new Error(`必要なデータが含まれていません: ${missingFields.join(', ')}`);
        }

        openDialog('confirm', {
          title: 'データのインポート',
          message: `「${data.appName || 'バックアップデータ'}」を読み込みますか？\n\n・タスク数: ${data.tasks.length}件\n・カテゴリ数: ${data.categories.length}件\n\n※現在のデータは完全に上書きされます。`,
          onConfirm: () => {
            try {
              if (data.appName) setAppName(data.appName);
              if (data.appIcon) setAppIcon(data.appIcon);
              setCategories(data.categories);
              setTasks(data.tasks);

              // Store the handle on success
              setCurrentFileHandle(fileHandle);

              closeDialog();
            } catch (updateError) {
              console.error("Update State Error:", updateError);
              openDialog('alert', { title: 'エラー', message: 'データの反映中にエラーが発生しました。' });
            }
          }
        });
      } catch (err: any) {
        console.error("Import Error:", err);
        openDialog('alert', {
          title: 'インポートエラー',
          message: `ファイルを読み込めませんでした。\n原因: ${err.message}`
        });
      }
    };

    reader.onerror = () => {
      openDialog('alert', { title: '読み込みエラー', message: 'ファイルの読み取り時にエラーが発生しました。' });
    };

    try {
      reader.readAsText(file);
    } catch (readError: any) {
      openDialog('alert', { title: 'エラー', message: 'ファイルの読み込みを開始できませんでした。' });
    }
  };

  const handleImportClick = async () => {
    let usedFilePicker = false;
    // Check if File System Access API is supported
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'JSON Files',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
          multiple: false
        });
        const file = await fileHandle.getFile();
        importDataFromFile(file, fileHandle);
        usedFilePicker = true;
      } catch (err: any) {
        // User cancelled or error
        if (err.name === 'AbortError') {
          return;
        }
        console.warn("File Picker API failed (likely security restriction), falling back to input:", err);
        // Fallthrough to input click
      }
    }

    if (!usedFilePicker) {
      // Fallback to input element
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
        fileInputRef.current.click();
      }
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importDataFromFile(file, null); // No handle available via input
    }
  };

  // --- Drag & Drop Handlers for File Import ---

  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    // Only activate for files
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current += 1;
      setIsDragFileOver(true);
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragFileOver(false);
      }
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    // Check if we are in file drag mode
    if (isDragFileOver) {
      dragCounter.current = 0;
      setIsDragFileOver(false);

      // Try to get FileSystemHandle using the modern API if available
      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const item = items[0];
        if (item.kind === 'file') {
          // Try to get handle
          if ('getAsFileSystemHandle' in item) {
            try {
              const handle = await (item as any).getAsFileSystemHandle();
              if (handle.kind === 'file') {
                const file = await handle.getFile();
                importDataFromFile(file, handle);
                return;
              }
            } catch (err) {
              console.warn("Failed to get file handle from drop:", err);
            }
          }
        }
      }

      // Fallback to standard file drop
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        importDataFromFile(file, null);
      }
    }
  };

  // --- Handlers ---

  const handleCreateTask = (dateStr: string, columnId: string) => {
    if (categories.length === 0) {
      openDialog('alert', { title: "カテゴリがありません", message: "先にカテゴリを作成してください。" });
      return;
    }

    const initialCategory = groupBy === 'category' ? columnId : (categories[0]?.id || '');
    const initialAssignee = groupBy === 'assignee' ? (columnId === '__unassigned__' ? '' : columnId) : '';

    openDialog('task-form', {
      task: {
        id: '', // Will be generated
        title: '',
        description: '',
        date: dateStr,
        categoryId: initialCategory,
        assignee: initialAssignee,
        subtasks: []
      },
      onConfirm: () => { /* handled by form submit */ }
    });
  };

  const handleEditTask = (task: Task) => {
    openDialog('task-form', {
      task,
      onConfirm: () => { /* handled by form submit */ }
    });
  };

  const saveTask = (partialTask: Partial<Task>) => {
    if (!partialTask.title) return;

    if (partialTask.id) {
      // Update
      setTasks(tasks.map(t => t.id === partialTask.id ? { ...t, ...partialTask } as Task : t));
    } else {
      // Create
      const newTask: Task = {
        ...partialTask as Task,
        id: crypto.randomUUID(),
      };
      setTasks([...tasks, newTask]);
    }
    closeDialog();
  };

  const deleteTask = (taskId: string) => {
    openDialog('confirm', {
      title: 'タスクの削除',
      message: '本当にこのタスクを削除しますか？',
      onConfirm: () => {
        setTasks(tasks.filter(t => t.id !== taskId));
        closeDialog();
      }
    });
  };

  const moveTask = (taskId: string, newDate: string, newColumnId: string) => {
    setTasks(tasks.map(t => {
      if (t.id !== taskId) return t;

      const updates: Partial<Task> = { date: newDate };
      if (groupBy === 'category') {
        updates.categoryId = newColumnId;
      } else {
        // If moving between assignees
        updates.assignee = newColumnId === '__unassigned__' ? '' : newColumnId;
      }
      return { ...t, ...updates };
    }));
  };

  const addCategory = () => {
    openDialog('prompt', {
      title: '新しいカテゴリ',
      message: 'カテゴリ名を入力してください:',
      defaultText: '',
      onConfirm: (name) => {
        if (name) {
          setCategories([...categories, { id: crypto.randomUUID(), name }]);
          closeDialog();
        }
      }
    });
  };

  const updateCategory = (id: string, name: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, name } : c));
  };

  const deleteCategory = (id: string) => {
    openDialog('confirm', {
      title: 'カテゴリの削除',
      message: 'このカテゴリを削除すると、関連するすべてのタスクも削除されます。よろしいですか？',
      onConfirm: () => {
        setCategories(categories.filter(c => c.id !== id));
        setTasks(tasks.filter(t => t.categoryId !== id));
        closeDialog();
      }
    });
  };

  const openSettings = () => {
    openDialog('settings', {
      title: 'アプリ設定',
      currentAppName: appName,
      currentAppIcon: appIcon,
      currentFileName: currentFileHandle?.name, // Pass the file name here
      onSettingsSave: (name, icon) => {
        setAppName(name);
        setAppIcon(icon);
        closeDialog();
      },
      onResetData: () => {
        // Close settings dialog first, then open confirmation
        openDialog('confirm', {
          title: 'データの完全初期化',
          message: '本当にすべてのデータ（タスク、カテゴリ、設定）を初期化しますか？\nこの操作は取り消せません。',
          onConfirm: () => {
            setTasks(INITIAL_TASKS);
            setCategories(INITIAL_CATEGORIES);
            setAppName(DEFAULT_APP_NAME);
            setAppIcon(DEFAULT_APP_ICON);
            setCurrentFileHandle(null); // Reset file handle
            closeDialog();
          }
        });
      }
    });
  };

  // --- Render ---

  // Dialog Content Logic
  const renderDialogContent = () => {
    switch (dialogType) {
      case 'alert':
        return (
          <div className="space-y-4">
            <p className="text-slate-600 whitespace-pre-wrap">{dialogProps.message}</p>
            <div className="flex justify-end">
              <Button onClick={closeDialog}>OK</Button>
            </div>
          </div>
        );
      case 'confirm':
        return (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-slate-600">{dialogProps.message}</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeDialog}>キャンセル</Button>
              <Button variant="danger" onClick={() => dialogProps.onConfirm?.()}>OK</Button>
            </div>
          </div>
        );
      case 'prompt':
        return (
          <PromptForm
            defaultValue={dialogProps.defaultText}
            inputType={dialogProps.inputType}
            onSubmit={(val) => dialogProps.onConfirm?.(val)}
            onCancel={closeDialog}
          />
        );
      case 'settings':
        return (
          <SettingsForm
            currentName={dialogProps.currentAppName || DEFAULT_APP_NAME}
            currentIcon={dialogProps.currentAppIcon || DEFAULT_APP_ICON}
            currentFileName={dialogProps.currentFileName} // Pass prop
            onSave={(name, icon) => dialogProps.onSettingsSave?.(name, icon)}
            onReset={dialogProps.onResetData}
            onCancel={closeDialog}
          />
        );
      case 'task-form':
        return (
          <div>
            <TaskForm
              initialTask={dialogProps.task}
              categories={categories}
              onSubmit={saveTask}
              onCancel={closeDialog}
            />
            {dialogProps.task?.id && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-start">
                <Button variant="danger" className="text-sm px-2 py-1" onClick={() => deleteTask(dialogProps.task!.id)}>タスクを削除</Button>
              </div>
            )}
          </div>
        );
      case 'calendar':
        return (
          <CalendarPicker
            initialDate={currentDate}
            tasks={dialogProps.tasks || []}
            onSelect={(dateStr) => dialogProps.onConfirm?.(dateStr)}
            onCancel={closeDialog}
          />
        );
      default:
        return null;
    }
  };

  const getPeriodLabel = () => {
    const end = new Date(currentDate);
    const monthsToAdd = viewMode === '1month' ? 1 : viewMode === '3months' ? 3 : 6;
    end.setMonth(end.getMonth() + monthsToAdd - 1);

    if (viewMode === '1month') {
      return currentDate.toLocaleDateString('ja-JP', { month: 'long', year: 'numeric' });
    }
    return `${currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })} - ${end.toLocaleDateString('ja-JP', { month: 'short' })}`;
  };

  return (
    <div
      className="flex flex-col h-screen bg-slate-50 relative"
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >

      {/* File Import Overlay */}
      {isDragFileOver && (
        <div className="fixed inset-0 z-50 bg-blue-500/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none border-4 border-white border-dashed m-4 rounded-xl transition-opacity animate-in fade-in">
          <div className="bg-white p-6 rounded-full shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">JSONファイルをドロップ</h2>
          <p className="text-blue-50 text-lg drop-shadow">現在のデータを上書きしてインポートします</p>
        </div>
      )}

      {/* Header */}
      <header className="flex-none p-4 bg-white border-b border-slate-200 shadow-sm z-30">
        <div className="flex flex-col xl:flex-row items-center gap-4">

          {/* Left: App Logo & Title */}
          <div className="flex items-center gap-4 w-full xl:w-auto xl:flex-1">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 text-white flex-shrink-0">
              {APP_ICONS[appIcon] || APP_ICONS['kanban']}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight truncate">{appName}</h1>
              {/* Show file name if available */}
              {currentFileHandle && (
                <p className="text-xs text-slate-500 truncate" title={`保存先: ${currentFileHandle.name}`}>
                  保存先: {currentFileHandle.name}
                </p>
              )}
            </div>

            {/* Setting / Export / Import Controls */}
            <div className="flex items-center gap-1 ml-1 flex-shrink-0">
              <button
                onClick={openSettings}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                title="設定"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="h-5 w-px bg-slate-200 mx-1"></div>

              {/* Save (Overwrite) Button */}
              {/* Always show, acts as Save As if no handle */}
              <button
                onClick={handleQuickSave}
                className={`p-1.5 rounded-full transition-colors ${currentFileHandle
                    ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                    : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                  }`}
                title={currentFileHandle ? "上書き保存" : "保存 (名前を付けて保存)"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>

              <button
                onClick={handleExport}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
                title="データをエクスポート (別名保存)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={handleImportClick}
                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-slate-100 rounded-full transition-colors"
                title="データをインポート (読込)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
              <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={handleImportFileChange}
                accept=".json"
              />
            </div>
          </div>

          {/* Center: Controls (Date & View Mode) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full xl:w-auto">
            {/* Date Navigation */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-white rounded-md transition-colors text-slate-600"
                title="前へ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white rounded-md min-w-[160px] shadow-sm cursor-default"
                title="表示中の期間"
              >
                <span className="font-semibold text-slate-700 text-sm select-none">
                  {getPeriodLabel()}
                </span>
              </div>

              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-white rounded-md transition-colors text-slate-600"
                title="次へ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="w-px h-5 bg-slate-300 mx-1"></div>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-bold bg-white text-blue-600 border border-slate-200 rounded hover:bg-blue-50 transition-colors"
              >
                今日
              </button>
            </div>

            {/* View Mode & Group Switcher */}
            <div className="flex items-center gap-2">
              {/* Category/Assignee Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setGroupBy('category')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${groupBy === 'category'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  カテゴリ別
                </button>
                <button
                  onClick={() => setGroupBy('assignee')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${groupBy === 'assignee'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  担当者別
                </button>
              </div>

              {/* Date Range Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg hidden lg:flex">
                {(['1month', '3months', '6months'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === mode
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {mode === '1month' ? '1ヶ月' : mode === '3months' ? '3ヶ月' : '6ヶ月'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex justify-end gap-2 w-full xl:w-auto xl:flex-1">
            <Button
              onClick={() => handleCreateTask(new Date().toISOString().split('T')[0], categories[0]?.id || '')}
              className="text-sm shadow-md"
            >
              + タスク追加
            </Button>
            {groupBy === 'category' && (
              <Button onClick={addCategory} variant="secondary" className="text-sm">
                + カテゴリ追加
              </Button>
            )}
          </div>

        </div>
      </header>

      {/* Main Board Container */}
      <main className="flex-1 flex overflow-hidden w-full">

        {/* Left: Timeline Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
            <div className="h-full min-w-max">
              <TimelineGrid
                currentDate={currentDate}
                columns={timelineColumns}
                groupBy={groupBy}
                tasks={tasks}
                onTaskClick={handleEditTask}
                onCellClick={handleCreateTask}
                onTaskMove={moveTask}
                onCategoryUpdate={updateCategory}
                onCategoryDelete={deleteCategory}
                dragGhost={dragGhost}
                setDragGhost={setDragGhost}
                viewMode={viewMode}
              />
            </div>
          </div>
        </div>

        {/* Right: Sidebar (Calendar) */}
        <div className="w-[320px] border-l border-slate-200 bg-white flex-shrink-0 flex flex-col shadow-lg z-20">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              カレンダー
            </h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            <CalendarPicker
              initialDate={currentDate}
              tasks={tasks}
              onSelect={(dateStr) => {
                const currentSelectedStr = currentDate.toISOString().split('T')[0];
                if (dateStr === currentSelectedStr) {
                  handleCreateTask(dateStr, categories[0]?.id || '');
                } else {
                  setCurrentDate(new Date(dateStr));
                }
              }}
            />
          </div>
        </div>

      </main>

      {/* Global Dialog */}
      <Dialog
        isOpen={dialogOpen}
        title={dialogProps.title || (dialogType === 'task-form' ? (dialogProps.task?.id ? 'タスクの編集' : '新規タスク') : 'お知らせ')}
        onClose={closeDialog}
        width={dialogType === 'task-form' ? 'max-w-xl' : dialogType === 'calendar' ? 'max-w-md' : 'max-w-sm'}
      >
        {renderDialogContent()}
      </Dialog>
    </div>
  );
};

export default App;
