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

    return {
        tasks,
        setTasks,
        categories,
        setCategories,
        appName,
        setAppName,
        appIcon,
        setAppIcon
    };
};
