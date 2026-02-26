import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task, Category, CalendarEvent, DialogType, DialogOptions } from '../types';


interface UseFileOperationsProps {
    tasks: Task[];
    setTasks: (tasks: Task[]) => void;
    categories: Category[];
    setCategories: (categories: Category[]) => void;
    events: CalendarEvent[];
    setEvents: (events: CalendarEvent[]) => void;
    appName: string;
    setAppName: (name: string) => void;
    appIcon: string;
    setAppIcon: (icon: string) => void;

    autoSaveEnabled: boolean;
    setAutoSaveEnabled: (enabled: boolean) => void;
    autoUpdateEnabled: boolean;

    currentFileHandle: any;
    setCurrentFileHandle: (handle: any) => void;

    saveFile: (data: any, options?: any) => Promise<void>;
    saveFileAs: (data: any, filename: string) => void;
    readFile: (file: File) => Promise<any>;
    pickFile: () => Promise<{ file: File, handle: any }>;
    reloadFile: () => Promise<any>;
    restoreLastHandle: () => Promise<any>;

    openDialog: (type: DialogType, options?: DialogOptions) => void;
    closeDialog: () => void;
}

export const useFileOperations = ({
    tasks, setTasks,
    categories, setCategories,
    events, setEvents,
    appName, setAppName,
    appIcon, setAppIcon,
    autoSaveEnabled, setAutoSaveEnabled,
    autoUpdateEnabled,
    currentFileHandle, setCurrentFileHandle,
    saveFile, saveFileAs, readFile, pickFile, reloadFile, restoreLastHandle,
    openDialog, closeDialog
}: UseFileOperationsProps) => {

    const lastModifiedRef = useRef<number>(0);
    const isSaving = useRef(false);
    const [showAutoSaveSuccess, setShowAutoSaveSuccess] = useState(false);
    const [showAutoSaveError, setShowAutoSaveError] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Drag & Drop State
    const [isDragFileOver, setIsDragFileOver] = useState(false);
    const dragCounter = useRef(0);

    // --- Helper: Get Export Data ---
    const getExportData = useCallback((overrides?: { tasks?: Task[], categories?: Category[], events?: CalendarEvent[] }) => {
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
    }, [appName, appIcon, categories, tasks, events]);

    // --- Process Imported Data ---
    const processImportedData = useCallback((data: any, fileHandle: any = null, silent: boolean = false) => {
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
                    setTasks(data.tasks);
                    if (data.events) setEvents(data.events);

                    setCurrentFileHandle(fileHandle);

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
    }, [setAppName, setAppIcon, setCategories, setTasks, setEvents, setCurrentFileHandle, openDialog, closeDialog]);

    // --- Auto-Load Last File ---
    useEffect(() => {
        const init = async () => {
            try {
                const handle = await restoreLastHandle();
                if (handle) {
                    const opts: any = { mode: 'readwrite' };
                    if ((await (handle as any).queryPermission(opts)) === 'granted') {
                        try {
                            const file = await handle.getFile();
                            const data = await readFile(file);
                            processImportedData(data, handle);
                        } catch (e: any) {
                            console.error("Auto-load failed:", e);
                            openDialog('alert', { title: '自動読み込みエラー', message: `ファイルの読み込みに失敗しました。\n${e.message || '不明なエラー'}` });
                        }
                    } else {
                        openDialog('confirm', {
                            title: '以前のファイルを開く',
                            message: `前回開いていたファイル「${handle.name}」を読み込みますか？\n（ブラウザにより権限の確認が求められます）`,
                            onConfirm: async () => {
                                closeDialog();
                                try {
                                    if ((await (handle as any).requestPermission(opts)) === 'granted') {
                                        const file = await handle.getFile();
                                        const data = await readFile(file);
                                        processImportedData(data, handle);
                                    } else {
                                        openDialog('alert', { title: '権限エラー', message: 'ファイルへのアクセスが許可されませんでした。' });
                                    }
                                } catch (e: any) {
                                    console.error("Permission request failed:", e);
                                    openDialog('alert', { title: '読み込みエラー', message: `権限の要求中にエラーが発生しました。\n${e.message || '不明なエラー'}` });
                                }
                            }
                        });
                    }
                }
            } catch (e: any) {
                console.error("Failed to restore handle:", e);
                openDialog('alert', { title: '復元エラー', message: `前回のファイルの復元に失敗しました。\n${e.message || '不明なエラー'}` });
            }
        };
        init();
    }, [restoreLastHandle, readFile, processImportedData, openDialog, closeDialog]);

    // --- Auto Update Polling ---
    useEffect(() => {
        if (!autoUpdateEnabled || !currentFileHandle) return;

        const checkFile = async () => {
            if (isSaving.current) return;
            try {
                const file = await currentFileHandle.getFile();
                if (file.lastModified > lastModifiedRef.current) {
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
    }, [autoUpdateEnabled, currentFileHandle, readFile, processImportedData]);

    // --- Try Auto Save ---
    const tryAutoSave = useCallback(async (overrides?: { tasks?: Task[], categories?: Category[], events?: CalendarEvent[] }) => {
        if (!autoSaveEnabled || !currentFileHandle) return;

        try {
            isSaving.current = true;
            const data = getExportData(overrides);
            await saveFile(data, { checkCollision: true, lastModified: lastModifiedRef.current });
            console.log("Auto-saved successfully.");

            if (currentFileHandle) {
                try {
                    const file = await currentFileHandle.getFile();
                    lastModifiedRef.current = file.lastModified;
                } catch (e) {
                    console.warn("Failed to update lastModifiedRef after auto-save", e);
                }
            }

            setShowAutoSaveSuccess(true);
            setTimeout(() => setShowAutoSaveSuccess(false), 2000);
        } catch (e: any) {
            console.error("Auto-save failed:", e);
            if (e.name === 'FileCollisionError') {
                setAutoSaveEnabled(false);
                setShowAutoSaveError(true);
                setTimeout(() => setShowAutoSaveError(false), 5000);
            }
        } finally {
            isSaving.current = false;
        }
    }, [autoSaveEnabled, currentFileHandle, getExportData, saveFile, setAutoSaveEnabled]);

    // --- Export / Save ---
    const handleExport = useCallback(() => {
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
    }, [getExportData, appName, saveFileAs, openDialog]);

    const handleQuickSave = useCallback(async () => {
        if (!currentFileHandle) {
            handleExport();
            return;
        }

        try {
            isSaving.current = true;
            const data = getExportData();
            await saveFile(data, { checkCollision: true, lastModified: lastModifiedRef.current });

            if (currentFileHandle) {
                try {
                    const file = await currentFileHandle.getFile();
                    lastModifiedRef.current = file.lastModified;
                } catch (e) {
                    console.warn("Failed to update lastModifiedRef after save", e);
                }
            }

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

            let message = `ファイルの保存中にエラーが発生しました。\n${error.message || '不明なエラー'}`;
            let isSecurityError = false;

            if (error.name === 'NotAllowedError' || error.message.includes('Not allowed to request permissions') || error.name === 'SecurityError') {
                message = "この環境（プレビュー画面等）では、ブラウザのセキュリティ制限によりファイルへの直接書き込みが許可されていません。";
                isSecurityError = true;
            } else if (error.name === 'NotFoundError') {
                message = "保存先のファイルが見つかりません。移動または削除された可能性があります。";
                setCurrentFileHandle(null);
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
        } finally {
            isSaving.current = false;
        }
    }, [currentFileHandle, handleExport, getExportData, saveFile, openDialog, setCurrentFileHandle, closeDialog]);

    // --- Reload ---
    const handleReload = useCallback(async () => {
        if (!currentFileHandle) return;

        try {
            const data = await reloadFile();
            processImportedData(data, currentFileHandle);
        } catch (error: any) {
            console.error("Reload Error:", error);
            let message = `ファイルの読み込み中にエラーが発生しました。\n${error.message || '不明なエラー'}`;

            if (error.name === 'NotFoundError') {
                message = "参照先のファイルが見つかりません。移動または削除された可能性があります。";
                setCurrentFileHandle(null);
            }

            openDialog('alert', {
                title: 'リロードエラー',
                message: message
            });
        }
    }, [currentFileHandle, reloadFile, processImportedData, openDialog, setCurrentFileHandle]);

    // --- Import Handlers ---
    const importDataFromFile = useCallback((file: File, fileHandle: any = null) => {
        if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
            openDialog('alert', { title: 'エラー', message: 'JSONファイルを選択してください。' });
            return;
        }

        readFile(file)
            .then(data => processImportedData(data, fileHandle))
            .catch(() => {
                openDialog('alert', { title: '読み込みエラー', message: 'ファイルの読み込みを開始できませんでした。' });
            });
    }, [readFile, processImportedData, openDialog]);

    const handleImportClick = useCallback(async () => {
        try {
            const { file, handle } = await pickFile();
            importDataFromFile(file, handle);
        } catch (err: any) {
            if (err.name === 'AbortError') {
                return;
            }
            console.warn("File Picker API failed (likely security restriction), falling back to input:", err);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
        }
    }, [pickFile, importDataFromFile]);

    const handleImportFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            importDataFromFile(file, null);
        }
    }, [importDataFromFile]);

    // --- Drag & Drop ---
    const handleGlobalDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
            dragCounter.current += 1;
            setIsDragFileOver(true);
        }
    }, []);

    const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
            dragCounter.current -= 1;
            if (dragCounter.current === 0) {
                setIsDragFileOver(false);
            }
        }
    }, []);

    const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    const handleGlobalDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();

        if (isDragFileOver) {
            dragCounter.current = 0;
            setIsDragFileOver(false);

            const items = e.dataTransfer.items;
            if (items && items.length > 0) {
                const item = items[0];
                if (item.kind === 'file') {
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

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                importDataFromFile(file, null);
            }
        }
    }, [isDragFileOver, importDataFromFile]);

    return {
        tryAutoSave,
        handleExport,
        handleImportClick,
        handleImportFileChange,
        handleQuickSave,
        handleReload,
        handleGlobalDragEnter,
        handleGlobalDragOver,
        handleGlobalDragLeave,
        handleGlobalDrop,
        isDragFileOver,
        showAutoSaveSuccess,
        showAutoSaveError,
        fileInputRef
    };
};
