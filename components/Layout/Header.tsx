import React from 'react';
import { ViewMode, GroupByMode, Task, DialogType, DialogOptions } from '../../types';
import { APP_ICONS } from '../../utils/icons';
import { Button } from '../UI/Button';

interface HeaderProps {
    appName: string;
    appIcon: string;
    currentFileName?: string;

    showAutoSaveSuccess: boolean;
    showAutoSaveError: boolean;

    onOpenSettings: () => void;
    onQuickSave: () => void;
    onReload: () => void;
    onExport: () => void;
    onImportClick: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

    onNavigateDate: (direction: 'prev' | 'next') => void;
    periodLabel: string;

    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    isCompactMode: boolean;
    setIsCompactMode: (isCompact: boolean) => void;
    groupBy: GroupByMode;
    setGroupBy: (mode: GroupByMode) => void;

    onCreateTask: () => void;
    onCreateEvent: () => void;

    openDialog: (type: DialogType, options?: DialogOptions) => void;
    closeDialog: () => void;
    tasks: Task[];
    setCurrentDate: (d: Date) => void;
}

export const Header: React.FC<HeaderProps> = ({
    appName,
    appIcon,
    currentFileName,
    showAutoSaveSuccess,
    showAutoSaveError,
    onOpenSettings,
    onQuickSave,
    onReload,
    onExport,
    onImportClick,
    fileInputRef,
    onImportFileChange,
    onNavigateDate,
    periodLabel,
    viewMode,
    setViewMode,
    isCompactMode,
    setIsCompactMode,
    groupBy,
    setGroupBy,
    onCreateTask,
    onCreateEvent,
    openDialog,
    closeDialog,
    tasks,
    setCurrentDate
}) => {
    return (
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
                        {currentFileName && (
                            <p className="text-xs text-slate-500 truncate" title={`保存先: ${currentFileName}`}>
                                保存先: {currentFileName}
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
                            onClick={onOpenSettings}
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
                            onClick={onQuickSave}
                            className={`p-1.5 rounded-full transition-colors ${currentFileName
                                ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                                }`}
                            title={currentFileName ? "上書き保存" : "保存 (名前を付けて保存)"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                        </button>

                        <button
                            onClick={onReload}
                            disabled={!currentFileName}
                            className={`p-1.5 rounded-full transition-colors ${currentFileName
                                ? 'text-slate-400 hover:text-green-600 hover:bg-slate-100'
                                : 'text-slate-300 cursor-not-allowed'
                                }`}
                            title={currentFileName ? "最新の状態に更新 (リロード)" : "リロード (ファイル未保存)"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <div className="h-5 w-px bg-slate-200 mx-1"></div>

                        <button
                            onClick={onExport}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
                            title="データをエクスポート (別名保存)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>

                        <button
                            onClick={onImportClick}
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
                            onChange={onImportFileChange}
                            accept=".json"
                        />
                    </div>
                </div>

                {/* Center: Date Navigation & View Controls (Resulting group centered on XL) */}
                <div className="flex flex-col xl:flex-row items-center justify-center gap-3 bg-white/50 p-1 rounded-xl xl:absolute xl:left-1/2 xl:top-1/2 xl:transform xl:-translate-x-1/2 xl:-translate-y-1/2">

                    {/* Date Navigation */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => onNavigateDate('prev')}
                            className="p-2 hover:bg-white rounded-md transition-colors text-slate-600"
                            title="前へ"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <button
                            onClick={() => {
                                openDialog('calendar', {
                                    tasks,
                                    onConfirm: (d) => { if (d) setCurrentDate(new Date(d)); closeDialog(); }
                                });
                            }}
                            className="w-40 py-2 bg-white rounded-md shadow-sm font-bold text-slate-700 hover:text-blue-600 transition-colors text-center"
                        >
                            {periodLabel}
                        </button>

                        <button
                            onClick={() => onNavigateDate('next')}
                            className="p-2 hover:bg-white rounded-md transition-colors text-slate-600"
                            title="次へ"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* View Mode Switching */}
                    <div className="flex bg-slate-100 p-1 rounded-lg items-center">
                        <div className="flex mr-2">
                            <button
                                onClick={() => !isCompactMode && setViewMode('1month')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === '1month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'} ${isCompactMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                1ヶ月
                            </button>
                            <button
                                onClick={() => !isCompactMode && setViewMode('3months')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === '3months' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'} ${isCompactMode ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                        {/* Compact Mode Toggle */}
                        <div className="h-4 w-px bg-slate-200 mx-1"></div>
                        <button
                            onClick={() => {
                                const newMode = !isCompactMode;
                                setIsCompactMode(newMode);
                                if (newMode) setViewMode('6months');
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${isCompactMode ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            title="圧縮表示（縮小モード）"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isCompactMode ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                )}
                            </svg>
                            <span>縮小</span>
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

                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-2 w-full xl:w-auto">
                    <Button variant="primary" onClick={onCreateTask}>
                        + タスク追加
                    </Button>
                    <Button variant="secondary" onClick={onCreateEvent} title="期間イベントを追加">
                        + イベント追加
                    </Button>
                </div>
            </div>
        </header >
    );
};
