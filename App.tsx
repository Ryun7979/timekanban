
import React, { useState, useRef, useMemo } from 'react';
import { Task, Category, CalendarEvent, DialogType, DialogOptions, DragGhost, ViewMode, GroupByMode } from './types';
import { TimelineGrid } from './components/Timeline/TimelineGrid';
import { Dialog } from './components/UI/Dialog';
import { TaskForm } from './components/TaskForm';
import { EventForm } from './components/EventForm';
import { Button } from './components/UI/Button';
import { CalendarPicker } from './components/UI/CalendarPicker';
import { PromptForm } from './components/UI/PromptForm';
import { SettingsForm } from './components/SettingsForm';
import { APP_ICONS } from './utils/icons';
import { useKanbanData } from './hooks/useKanbanData';
import { useFileSystem } from './hooks/useFileSystem';
import { INITIAL_TASKS, INITIAL_CATEGORIES, DEFAULT_APP_NAME, DEFAULT_APP_ICON } from './utils/constants';

const App: React.FC = () => {
  // --- Hooks ---
  const {
    tasks, setTasks,
    categories, setCategories,
    events, setEvents,
    appName, setAppName,
    appIcon, setAppIcon,
    updateData, undo, redo
  } = useKanbanData();

  const {
    currentFileHandle, setCurrentFileHandle,
    saveFile, saveFileAs, readFile, pickFile, reloadFile,
    restoreLastHandle
  } = useFileSystem();

  // --- Auto-Load Last File ---
  React.useEffect(() => {
    const init = async () => {
      const handle = await restoreLastHandle();
      if (handle) {
        // Check permission
        const opts: any = { mode: 'read' };
        if ((await (handle as any).queryPermission(opts)) === 'granted') {
          // If granted, load immediately
          try {
            const file = await handle.getFile();
            const data = await readFile(file);
            processImportedData(data, handle);
          } catch (e) {
            console.error("Auto-load failed:", e);
          }
        } else {
          // If prompt needed, ask user first via Dialog
          // We need a slight delay to ensure Dialog system is ready? No, state update should work.
          openDialog('confirm', {
            title: '以前のファイルを開く',
            message: `前回開いていたファイル「${handle.name}」を読み込みますか？\n（ブラウザにより権限の確認が求められます）`,
            onConfirm: async () => {
              try {
                if ((await (handle as any).requestPermission(opts)) === 'granted') {
                  const file = await handle.getFile();
                  const data = await readFile(file);
                  processImportedData(data, handle);
                }
              } catch (e) {
                console.error("Permission request failed:", e);
              }
              closeDialog();
            }
          });
        }
      }
    };
    init();
  }, []);

  // --- UI State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('1month');
  const [groupBy, setGroupBy] = useState<GroupByMode>('category');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const lastModifiedRef = useRef<number>(0);
  const [showAutoSaveSuccess, setShowAutoSaveSuccess] = useState(false);
  const [showAutoSaveError, setShowAutoSaveError] = useState(false);

  // --- Keyboard Shortcuts (Undo/Redo) ---
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is on an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          // Redo: Ctrl+Shift+Z
          e.preventDefault();
          const newState = redo();
          if (newState) tryAutoSave(newState);
        } else {
          // Undo: Ctrl+Z
          e.preventDefault();
          const newState = undo();
          if (newState) tryAutoSave(newState);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        // Redo: Ctrl+Y
        e.preventDefault();
        const newState = redo();
        if (newState) tryAutoSave(newState);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, tasks, categories, events, autoSaveEnabled]);

  // --- Auto Update Polling ---
  React.useEffect(() => {
    if (!autoUpdateEnabled || !currentFileHandle) return;

    const checkFile = async () => {
      try {
        const file = await currentFileHandle.getFile();
        if (file.lastModified > lastModifiedRef.current) {
          // File changed externally
          console.log("File change detected, reloading...");
          const data = await readFile(file);
          processImportedData(data, currentFileHandle, true); // silent reload
        }
      } catch (e) {
        console.warn("Auto update check failed:", e);
      }
    };

    const interval = setInterval(checkFile, 1000);
    return () => clearInterval(interval);
  }, [autoUpdateEnabled, currentFileHandle, readFile]);

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

  const getExportData = (overrides?: { tasks?: Task[], categories?: Category[], events?: CalendarEvent[] }) => {
    return {
      meta: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
      },
      appName,
      appIcon,
      categories: overrides?.categories || categories,
      tasks: overrides?.tasks || tasks,
      events: overrides?.events || events
    };
  };

  const tryAutoSave = async (overrides?: { tasks?: Task[], categories?: Category[], events?: CalendarEvent[] }) => {
    if (!autoSaveEnabled || !currentFileHandle) return;

    try {
      const data = getExportData(overrides);
      await saveFile(data, { checkCollision: true, lastModified: lastModifiedRef.current });
      console.log("Auto-saved successfully.");

      // Update lastModifiedRef to prevent auto-reload triggering
      if (currentFileHandle) {
        try {
          const file = await currentFileHandle.getFile();
          lastModifiedRef.current = file.lastModified;
        } catch (e) {
          console.warn("Failed to update lastModifiedRef after auto-save", e);
        }
      }

      // Show notification
      setShowAutoSaveSuccess(true);
      setTimeout(() => setShowAutoSaveSuccess(false), 2000);
    } catch (e: any) {
      console.error("Auto-save failed:", e);
      if (e.name === 'FileCollisionError') {
        // Disable auto-save to prevent looping
        setAutoSaveEnabled(false);
        setShowAutoSaveError(true);
        setTimeout(() => setShowAutoSaveError(false), 5000);
      }
    }
  };

  const handleExport = () => {
    try {
      const data = getExportData();

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const h = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${y}-${m}-${d}_${h}-${min}-${s}`;

      const safeAppName = appName ? appName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') : 'backup';
      const filename = `${safeAppName}_${timestamp}.json`;

      saveFileAs(data, filename);

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
      await saveFile(data, { checkCollision: true, lastModified: lastModifiedRef.current });

      // Update lastModifiedRef
      if (currentFileHandle) {
        try {
          const file = await currentFileHandle.getFile();
          lastModifiedRef.current = file.lastModified;
        } catch (e) {
          console.warn("Failed to update lastModifiedRef after save", e);
        }
      }

      // Optional: show success toast here if desired.
      console.log("File saved successfully.");
      setShowAutoSaveSuccess(true);
      setTimeout(() => setShowAutoSaveSuccess(false), 2000);

    } catch (error: any) {
      console.error("Quick Save Error:", error);

      if (error.name === 'FileCollisionError') {
        openDialog('confirm', {
          title: '競合が発生しました',
          message: 'ファイルが外部で変更されています。\n強制的に上書きしますか？',
          onConfirm: async () => {
            try {
              const data = getExportData();
              await saveFile(data, { checkCollision: false });
              // Update lastModifiedRef
              if (currentFileHandle) {
                const file = await currentFileHandle.getFile();
                lastModifiedRef.current = file.lastModified;
              }
              closeDialog();
              setShowAutoSaveSuccess(true);
              setTimeout(() => setShowAutoSaveSuccess(false), 2000);
            } catch (err: any) {
              openDialog('alert', {
                title: '保存エラー',
                message: `強制保存に失敗しました。\n${err.message}`
              });
            }
          }
        });
        return;
      }

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

  const processImportedData = (data: any, fileHandle: any = null, silent: boolean = false) => {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error("データ形式が無効です。");
      }

      const missingFields = [];
      if (!Array.isArray(data.categories)) missingFields.push("categories");
      if (!Array.isArray(data.tasks)) missingFields.push("tasks");

      if (missingFields.length > 0) {
        throw new Error(`必要なデータが含まれていません: ${missingFields.join(', ')}`);
      }

      const applyData = () => {
        try {
          if (data.appName) setAppName(data.appName);
          if (data.appIcon) setAppIcon(data.appIcon);
          setCategories(data.categories);
          setCategories(data.categories);
          setTasks(data.tasks);
          if (data.events) setEvents(data.events);

          // Store the handle on success
          setCurrentFileHandle(fileHandle);

          // Update lastModifiedRef
          if (fileHandle) {
            fileHandle.getFile().then((f: File) => {
              lastModifiedRef.current = f.lastModified;
            }).catch((e: any) => console.warn("Failed to update ref", e));
          }

          if (!silent) closeDialog();
        } catch (updateError) {
          console.error("Update State Error:", updateError);
          if (!silent) openDialog('alert', { title: 'エラー', message: 'データの反映中にエラーが発生しました。' });
        }
      };

      if (silent) {
        applyData();
      } else {
        openDialog('confirm', {
          title: 'データのインポート',
          message: `「${data.appName || 'バックアップデータ'}」を読み込みますか？\n\n・タスク数: ${data.tasks.length}件\n・カテゴリ数: ${data.categories.length}件\n\n※現在のデータは完全に上書きされます。`,
          onConfirm: applyData
        });
      }
    } catch (err: any) {
      console.error("Import Validation Error:", err);
      if (!silent) {
        openDialog('alert', {
          title: 'インポートエラー',
          message: `データを読み込めませんでした。\n原因: ${err.message}`
        });
      }
    }
  };

  const importDataFromFile = (file: File, fileHandle: any = null) => {
    if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
      openDialog('alert', { title: 'エラー', message: 'JSONファイルを選択してください。' });
      return;
    }

    readFile(file)
      .then(data => processImportedData(data, fileHandle))
      .catch(() => {
        openDialog('alert', { title: '読み込みエラー', message: 'ファイルの読み込みを開始できませんでした。' });
      });
  };


  const handleImportClick = async () => {
    try {
      const { file, handle } = await pickFile();
      importDataFromFile(file, handle);
    } catch (err: any) {
      // User cancelled or error
      if (err.name === 'AbortError') {
        return;
      }
      console.warn("File Picker API failed (likely security restriction), falling back to input:", err);

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

  const handleReload = async () => {
    if (!currentFileHandle) return;

    try {
      const data = await reloadFile();
      processImportedData(data, currentFileHandle);
    } catch (error: any) {
      console.error("Reload Error:", error);
      let message = `ファイルの読み込み中にエラーが発生しました。\n${error.message || '不明なエラー'}`;

      if (error.name === 'NotFoundError') {
        message = "参照先のファイルが見つかりません。移動または削除された可能性があります。";
        setCurrentFileHandle(null); // Link broken
      }

      openDialog('alert', {
        title: 'リロードエラー',
        message: message
      });
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
      const newTasks = tasks.map(t => t.id === partialTask.id ? { ...t, ...partialTask } as Task : t);
      updateData({ tasks: newTasks });
      tryAutoSave({ tasks: newTasks });
    } else {
      // Create
      const newTask: Task = {
        ...partialTask as Task,
        id: crypto.randomUUID(),
      };
      const newTasks = [...tasks, newTask];
      updateData({ tasks: newTasks });
      tryAutoSave({ tasks: newTasks });
    }
    closeDialog();
  };

  const deleteTask = (taskId: string) => {
    openDialog('confirm', {
      title: 'タスクの削除',
      message: '本当にこのタスクを削除しますか？',
      onConfirm: () => {
        const newTasks = tasks.filter(t => t.id !== taskId);
        updateData({ tasks: newTasks });
        tryAutoSave({ tasks: newTasks });
        closeDialog();
      }
    });
  };

  const moveTask = (taskId: string, newDate: string, newColumnId: string) => {
    const newTasks = tasks.map(t => {
      if (t.id !== taskId) return t;

      const updates: Partial<Task> = { date: newDate };
      if (groupBy === 'category') {
        updates.categoryId = newColumnId;
      } else {
        // If moving between assignees
        updates.assignee = newColumnId === '__unassigned__' ? '' : newColumnId;
      }
      return { ...t, ...updates };
    });
    updateData({ tasks: newTasks });
    tryAutoSave({ tasks: newTasks });
  };

  const addCategory = () => {
    openDialog('prompt', {
      title: '新しいカテゴリ',
      message: 'カテゴリ名を入力してください:',
      defaultText: '',
      onConfirm: (name) => {
        if (name) {
          const newCategories = [...categories, { id: crypto.randomUUID(), name }];
          updateData({ categories: newCategories });
          tryAutoSave({ categories: newCategories });
          closeDialog();
        }
      }
    });
  };

  const updateCategory = (id: string, name: string) => {
    const newCategories = categories.map(c => c.id === id ? { ...c, name } : c);
    updateData({ categories: newCategories });
    tryAutoSave({ categories: newCategories });
  };

  const handleCreateEvent = () => {
    openDialog('event-form', {
      event: {
        id: '',
        title: '',
        startDate: currentDate.toISOString().split('T')[0],
        endDate: currentDate.toISOString().split('T')[0],
        color: 'bg-blue-500'
      },
      onConfirm: () => { /* handled by form */ }
    });
  };

  const handleEditEvent = (event: CalendarEvent) => {
    openDialog('event-form', {
      event,
      onConfirm: () => { /* handled by form */ }
    });
  };

  const saveEvent = (partialEvent: Partial<CalendarEvent>) => {
    if (!partialEvent.title) return;

    if (partialEvent.id) {
      // Update
      const newEvents = events.map(e => e.id === partialEvent.id ? { ...e, ...partialEvent } as CalendarEvent : e);
      updateData({ events: newEvents });
      tryAutoSave({ events: newEvents });
    } else {
      // Create
      const newEvent: CalendarEvent = {
        ...partialEvent as CalendarEvent,
        id: crypto.randomUUID(),
      };
      const newEvents = [...events, newEvent];
      updateData({ events: newEvents });
      tryAutoSave({ events: newEvents });
    }
    closeDialog();
  };

  const deleteEvent = (eventId: string) => {
    openDialog('confirm', {
      title: 'イベントの削除',
      message: '本当にこのイベントを削除しますか？',
      onConfirm: () => {
        const newEvents = events.filter(e => e.id !== eventId);
        updateData({ events: newEvents });
        tryAutoSave({ events: newEvents });
        closeDialog();
      }
    });
  };

  const handleUpdateEventDate = (eventId: string, newStartDate: string, newEndDate: string) => {
    const newEvents = events.map(e => e.id === eventId ? { ...e, startDate: newStartDate, endDate: newEndDate } : e);
    updateData({ events: newEvents });
    tryAutoSave({ events: newEvents });
  };

  const deleteCategory = (id: string) => {
    openDialog('confirm', {
      title: 'カテゴリの削除',
      message: 'このカテゴリを削除すると、関連するすべてのタスクも削除されます。よろしいですか？',
      onConfirm: () => {
        const newCategories = categories.filter(c => c.id !== id);
        const newTasks = tasks.filter(t => t.categoryId !== id);

        updateData({ categories: newCategories, tasks: newTasks });

        tryAutoSave({ categories: newCategories, tasks: newTasks });
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
      case 'event-form':
        return (
          <EventForm
            initialEvent={dialogProps.event}
            onSubmit={saveEvent}
            onCancel={closeDialog}
            onDelete={dialogProps.event?.id ? deleteEvent : undefined}
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
      <header className="flex-none p-4 bg-white border-b border-slate-200 shadow-sm z-30 relative">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">

          {/* Left: App Logo & Title */}
          <div className="flex items-center gap-4 w-full xl:w-auto">
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
            <div className="flex items-center gap-1 ml-1 flex-shrink-0 relative">

              {/* Auto Save Notification - Absolute Positioned */}
              {showAutoSaveSuccess && (
                <>
                  <style>{`
                    @keyframes fadeInOut {
                      0% { opacity: 0; transform: translateY(2px) translateX(0px); }
                      15% { opacity: 1; transform: translateY(0) translateX(0); }
                      85% { opacity: 1; transform: translateY(0) translateX(0); }
                      100% { opacity: 0; transform: translateY(-2px) translateX(0); }
                    }
                  `}</style>
                  <div
                    className="absolute right-full mr-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full flex items-center gap-1 pointer-events-none whitespace-nowrap shadow-sm border border-green-200"
                    style={{ animation: 'fadeInOut 2s ease-in-out forwards' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>保存完了</span>
                  </div>
                </>
              )}

              {/* Auto Save Error Notification */}
              {showAutoSaveError && (
                <>
                  <style>{`
                    @keyframes fadeInOut {
                      0% { opacity: 0; transform: translateY(2px) translateX(0px); }
                      15% { opacity: 1; transform: translateY(0) translateX(0); }
                      85% { opacity: 1; transform: translateY(0) translateX(0); }
                      100% { opacity: 0; transform: translateY(-2px) translateX(0); }
                    }
                  `}</style>
                  <div
                    className="absolute right-full mr-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded-full flex items-center gap-1 pointer-events-none whitespace-nowrap shadow-sm border border-red-200"
                    style={{ animation: 'fadeInOut 5s ease-in-out forwards' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>自動保存停止（競合）</span>
                  </div>
                </>
              )}
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
                onClick={handleReload}
                disabled={!currentFileHandle}
                className={`p-1.5 rounded-full transition-colors ${currentFileHandle
                  ? 'text-slate-400 hover:text-green-600 hover:bg-slate-100'
                  : 'text-slate-300 cursor-not-allowed'
                  }`}
                title={currentFileHandle ? "最新の状態に更新 (リロード)" : "リロード (ファイル未保存)"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="h-5 w-px bg-slate-200 mx-1"></div>

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

          {/* Center: Date Navigation (Absolute Center on XL) */}
          {/* Center: Date Navigation & View Controls (Resulting group centered on XL) */}
          <div className="flex flex-col xl:flex-row items-center justify-center gap-3 bg-white/50 p-1 rounded-xl xl:absolute xl:left-1/2 xl:top-1/2 xl:transform xl:-translate-x-1/2 xl:-translate-y-1/2">

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

              <button
                onClick={() => {
                  setDialogType('calendar');
                  setDialogProps({
                    tasks,
                    onConfirm: (d) => { if (d) setCurrentDate(new Date(d)); closeDialog(); }
                  });
                  setDialogOpen(true);
                }}
                className="w-40 py-2 bg-white rounded-md shadow-sm font-bold text-slate-700 hover:text-blue-600 transition-colors text-center"
              >
                {getPeriodLabel()}
              </button>

              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-white rounded-md transition-colors text-slate-600"
                title="次へ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* View Mode Switching */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('1month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === '1month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                1ヶ月
              </button>
              <button
                onClick={() => setViewMode('3months')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === '3months' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                3ヶ月
              </button>
              <button
                onClick={() => setViewMode('6months')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === '6months' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                6ヶ月
              </button>
            </div>

            {/* Group By Switching */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setGroupBy('category')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${groupBy === 'category' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                カテゴリ
              </button>
              <button
                onClick={() => setGroupBy('assignee')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${groupBy === 'assignee' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                担当者
              </button>
            </div>
          </div>

          {/* Right: View Mode, Group By, Actions */}
          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2 w-full xl:w-auto">
            <Button variant="primary" onClick={() => handleCreateTask(new Date().toISOString().split('T')[0], 'todo')}>
              + タスク追加
            </Button>
            <Button variant="secondary" onClick={handleCreateEvent} title="期間イベントを追加">
              + イベント追加
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content: Timeline & Sidebar */}
      < div className="flex flex-1 overflow-hidden" >
        <main className="flex-1 overflow-hidden relative">
          <TimelineGrid
            tasks={tasks}
            columns={timelineColumns}
            currentDate={currentDate}
            viewMode={viewMode}
            groupBy={groupBy}
            events={events}
            onTaskClick={handleEditTask}
            onEventClick={handleEditEvent}
            onCellClick={handleCreateTask}
            onTaskMove={moveTask}
            onEventDateUpdate={handleUpdateEventDate}
            onCategoryAdd={addCategory}
            onCategoryUpdate={updateCategory}
            onCategoryDelete={deleteCategory}
            setDragGhost={setDragGhost}
            dragGhost={dragGhost}
          />
        </main>

        {/* Right Sidebar (Calendar) */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col hidden xl:flex z-20 shadow-[-4px_0_15px_-3px_rgb(0_0_0_/_0.05)]">
          <div className="p-4 border-b border-slate-100 font-bold text-slate-500 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            カレンダー
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <CalendarPicker
              initialDate={currentDate}
              tasks={tasks}
              onSelect={(dateStr) => setCurrentDate(new Date(dateStr))}
            />
          </div>

          {/* Settings in Sidebar */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sidebarAutoSave"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sidebarAutoSave" className="text-sm font-medium text-blue-700 cursor-pointer select-none">
                自動保存
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sidebarAutoUpdate"
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="sidebarAutoUpdate" className="text-sm font-medium text-green-700 cursor-pointer select-none">
                自動リロード
              </label>
            </div>
          </div>
        </aside>
      </div >

      {/* Dialogs */}
      {
        dialogOpen && (
          <Dialog
            isOpen={dialogOpen}
            onClose={closeDialog}
            title={dialogProps.title || (dialogType === 'task-form' ? (dialogProps.task?.id ? 'タスク編集' : '新規タスク') : '')}
            width={dialogType === 'task-form' ? 'max-w-xl' : undefined}
          >
            {renderDialogContent()}
          </Dialog>
        )
      }
    </div >
  );
};

export default App;
