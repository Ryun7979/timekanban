import { useCallback } from 'react';
import { Task, Category, CalendarEvent, GroupByMode, DialogType, DialogOptions } from '../types';
import { INITIAL_TASKS, INITIAL_CATEGORIES, DEFAULT_APP_NAME, DEFAULT_APP_ICON } from '../utils/constants';

interface UseTaskOperationsProps {
    tasks: Task[];
    categories: Category[];
    events: CalendarEvent[];
    appName: string;
    appIcon: string;

    setTasks: (t: Task[]) => void;
    setCategories: (c: Category[]) => void;
    setAppName: (n: string) => void;
    setAppIcon: (i: string) => void;
    setCurrentFileHandle: (h: any) => void;

    updateData: (updates: { tasks?: Task[], categories?: Category[], events?: CalendarEvent[] }) => void;
    tryAutoSave: (overrides?: { tasks?: Task[], categories?: Category[], events?: CalendarEvent[] }) => void;

    groupBy: GroupByMode;
    currentDate: Date;

    setEvents: (e: CalendarEvent[]) => void;

    // View State Setters
    setCurrentDate: (d: Date) => void;
    setViewMode: (v: any) => void; // Using any to avoid circular dependency or import issues if simple
    setGroupBy: (g: GroupByMode) => void;
    setIsCompactMode: (c: boolean) => void;

    // App Settings Setters
    setAutoSaveEnabled: (b: boolean) => void;
    setAutoUpdateEnabled: (b: boolean) => void;

    openDialog: (type: DialogType, options?: DialogOptions) => void;
    closeDialog: () => void;
    currentFileName?: string;
}

export const useTaskOperations = ({
    tasks,
    categories,
    events,
    appName,
    appIcon,
    setTasks,
    setCategories,
    setEvents,
    setAppName,
    setAppIcon,
    setCurrentFileHandle,
    setCurrentDate,
    setViewMode,
    setGroupBy,
    setIsCompactMode,
    setAutoSaveEnabled,
    setAutoUpdateEnabled,
    updateData,
    tryAutoSave,
    groupBy,
    currentDate,
    openDialog,
    closeDialog,
    currentFileName
}: UseTaskOperationsProps) => {

    // --- Task Operations ---
    const handleCreateTask = useCallback((dateStr: string, columnId?: string) => {
        if (categories.length === 0) {
            openDialog('alert', { title: "カテゴリがありません", message: "先にカテゴリを作成してください。" });
            return;
        }

        // Validate columnId: if it's not a valid category and we are grouping by category, fallback to first category
        const isValidCategory = categories.some(c => c.id === columnId);

        let initialCategory = '';
        let initialAssignee = '';

        if (groupBy === 'category') {
            initialCategory = isValidCategory ? (columnId || '') : categories[0].id;
        } else {
            // Assignee mode
            initialCategory = categories[0].id; // Assignee mode still needs a category
            if (columnId && columnId !== '__unassigned__') {
                initialAssignee = columnId;
            }
        }

        openDialog('task-form', {
            task: {
                id: '',
                title: '',
                description: '',
                date: dateStr,
                categoryId: initialCategory,
                assignee: initialAssignee,
                subtasks: []
            },
            onConfirm: () => { /* handled by form submit */ }
        });
    }, [categories, groupBy, openDialog]);

    const handleEditTask = useCallback((task: Task) => {
        openDialog('task-form', {
            task,
            onConfirm: () => { /* handled by form submit */ }
        });
    }, [openDialog]);

    const saveTask = useCallback((partialTask: Partial<Task>) => {
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
    }, [tasks, updateData, tryAutoSave, closeDialog]);

    const deleteTask = useCallback((taskId: string) => {
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
    }, [tasks, updateData, tryAutoSave, openDialog, closeDialog]);

    const moveTask = useCallback((taskId: string, newDate: string, newColumnId: string) => {
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
    }, [tasks, groupBy, updateData, tryAutoSave]);

    // --- Category Operations ---
    const addCategory = useCallback(() => {
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
    }, [categories, updateData, tryAutoSave, openDialog, closeDialog]);

    const updateCategory = useCallback((id: string, name: string) => {
        const newCategories = categories.map(c => c.id === id ? { ...c, name } : c);
        updateData({ categories: newCategories });
        tryAutoSave({ categories: newCategories });
    }, [categories, updateData, tryAutoSave]);

    const deleteCategory = useCallback((id: string) => {
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
    }, [categories, tasks, updateData, tryAutoSave, openDialog, closeDialog]);

    // --- Event Operations ---
    const handleCreateEvent = useCallback(() => {
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
    }, [currentDate, openDialog]);

    const handleEditEvent = useCallback((event: CalendarEvent) => {
        openDialog('event-form', {
            event,
            onConfirm: () => { /* handled by form */ }
        });
    }, [openDialog]);

    const saveEvent = useCallback((partialEvent: Partial<CalendarEvent>) => {
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
    }, [events, updateData, tryAutoSave, closeDialog]);

    const duplicateEvent = useCallback((partialEvent: Partial<CalendarEvent>) => {
        if (!partialEvent.title) return;

        const newEvent: CalendarEvent = {
            ...partialEvent as CalendarEvent,
            id: crypto.randomUUID(),
        };
        const newEvents = [...events, newEvent];
        updateData({ events: newEvents });
        tryAutoSave({ events: newEvents });
        closeDialog();
    }, [events, updateData, tryAutoSave, closeDialog]);

    const deleteEvent = useCallback((eventId: string) => {
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
    }, [events, updateData, tryAutoSave, openDialog, closeDialog]);

    const handleUpdateEventDate = useCallback((eventId: string, newStartDate: string, newEndDate: string) => {
        const newEvents = events.map(e => e.id === eventId ? { ...e, startDate: newStartDate, endDate: newEndDate } : e);
        updateData({ events: newEvents });
        tryAutoSave({ events: newEvents });
    }, [events, updateData, tryAutoSave]);

    // --- Settings ---
    const openSettings = useCallback(() => {
        openDialog('settings', {
            title: 'アプリ設定',
            currentAppName: appName,
            currentAppIcon: appIcon,
            currentFileName: currentFileName,
            onSettingsSave: (name, icon) => {
                setAppName(name);
                setAppIcon(icon);
                closeDialog();
            },
            onResetData: () => {
                // Close settings dialog first, then open confirmation
                openDialog('confirm', {
                    title: 'データの完全初期化',
                    message: '本当にすべてのデータ（タスク、カテゴリ、イベント、設定）を初期化しますか？\nこの操作は取り消せません。',
                    onConfirm: () => {
                        // Reset all data
                        setTasks(INITIAL_TASKS);
                        setCategories(INITIAL_CATEGORIES);
                        setEvents([]);
                        setAppName(DEFAULT_APP_NAME);
                        setAppIcon(DEFAULT_APP_ICON);
                        setCurrentFileHandle(null);

                        // Reset view settings
                        setCurrentDate(new Date());
                        setViewMode('6months');
                        setGroupBy('category');
                        setIsCompactMode(false);

                        // Reset app settings
                        setAutoSaveEnabled(false);
                        setAutoUpdateEnabled(false);

                        closeDialog();
                    }
                });
            }
        });
    }, [
        appName, appIcon, currentFileName, openDialog, closeDialog,
        setAppName, setAppIcon, setTasks, setCategories, setEvents, setCurrentFileHandle,
        setCurrentDate, setViewMode, setGroupBy, setIsCompactMode, setAutoSaveEnabled, setAutoUpdateEnabled
    ]);

    return {
        handleCreateTask,
        handleEditTask,
        saveTask,
        deleteTask,
        moveTask,
        addCategory,
        updateCategory,
        deleteCategory,
        handleCreateEvent,
        handleEditEvent,
        saveEvent,
        duplicateEvent,
        deleteEvent,
        handleUpdateEventDate,
        openSettings
    };
};
