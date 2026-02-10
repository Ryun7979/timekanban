import { useState, useEffect, useCallback } from 'react';
import { Task, Category, CalendarEvent } from '../types';
import { INITIAL_CATEGORIES, INITIAL_TASKS, INITIAL_EVENTS, DEFAULT_APP_NAME, DEFAULT_APP_ICON } from '../utils/constants';

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

    const [events, setEvents] = useState<CalendarEvent[]>(() => {
        try {
            const saved = localStorage.getItem('kanban-events');
            return saved ? JSON.parse(saved) : INITIAL_EVENTS;
        } catch (e) {
            console.error("Failed to load events from localStorage", e);
            return INITIAL_EVENTS;
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
        localStorage.setItem('kanban-events', JSON.stringify(events));
    }, [events]);

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
        events: CalendarEvent[];
    }

    const [past, setPast] = useState<HistoryState[]>([]);
    const [future, setFuture] = useState<HistoryState[]>([]);

    const updateData = useCallback((updates: { tasks?: Task[], categories?: Category[], events?: CalendarEvent[] }) => {
        // Save current state to past
        setPast(prev => {
            const newPast = [...prev, { tasks, categories, events }];
            if (newPast.length > 50) newPast.shift(); // Limit history to 50
            return newPast;
        });

        // Update state
        if (updates.tasks) setTasks(updates.tasks);
        if (updates.categories) setCategories(updates.categories);
        if (updates.events) setEvents(updates.events);

        // Clear future
        setFuture([]);
    }, [tasks, categories, events]);

    const undo = useCallback(() => {
        if (past.length === 0) return null;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        setPast(newPast);
        setFuture(prev => [{ tasks, categories, events }, ...prev]);

        setTasks(previous.tasks);
        setCategories(previous.categories);
        setEvents(previous.events);

        return previous;
    }, [past, tasks, categories, events]);

    const redo = useCallback(() => {
        if (future.length === 0) return null;

        const next = future[0];
        const newFuture = future.slice(1);

        setFuture(newFuture);
        setPast(prev => [...prev, { tasks, categories, events }]);

        setTasks(next.tasks);
        setCategories(next.categories);
        setEvents(next.events);

        return next;
    }, [future, tasks, categories, events]);

    return {
        tasks,
        setTasks,
        categories,
        setCategories,
        events,
        setEvents,
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
