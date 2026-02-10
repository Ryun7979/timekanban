import { useState, useEffect } from 'react';
import { Task, Category } from '../types';
import { INITIAL_CATEGORIES, INITIAL_TASKS, DEFAULT_APP_NAME, DEFAULT_APP_ICON } from '../utils/constants';

export const useKanbanData = () => {
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

    // --- History Management ---

    interface HistoryState {
        tasks: Task[];
        categories: Category[];
    }

    const [past, setPast] = useState<HistoryState[]>([]);
    const [future, setFuture] = useState<HistoryState[]>([]);

    const updateData = (updates: { tasks?: Task[], categories?: Category[] }) => {
        // Save current state to past
        setPast(prev => {
            const newPast = [...prev, { tasks, categories }];
            if (newPast.length > 50) newPast.shift(); // Limit history to 50
            return newPast;
        });

        // Update state
        if (updates.tasks) setTasks(updates.tasks);
        if (updates.categories) setCategories(updates.categories);

        // Clear future
        setFuture([]);
    };

    const undo = () => {
        if (past.length === 0) return null;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        setPast(newPast);
        setFuture(prev => [{ tasks, categories }, ...prev]);

        setTasks(previous.tasks);
        setCategories(previous.categories);

        return previous;
    };

    const redo = () => {
        if (future.length === 0) return null;

        const next = future[0];
        const newFuture = future.slice(1);

        setFuture(newFuture);
        setPast(prev => [...prev, { tasks, categories }]);

        setTasks(next.tasks);
        setCategories(next.categories);

        return next;
    };

    return {
        tasks,
        setTasks,
        categories,
        setCategories,
        appName,
        setAppName,
        appIcon,
        setAppIcon,
        updateData,
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0
    };
};
