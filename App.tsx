import React, { useState, useMemo, useEffect } from 'react';
import { ViewMode, GroupByMode, DragGhost } from './types';
import { getTaskDisplayName } from './utils/taskUtils';
import { TimelineGrid } from './components/Timeline/TimelineGrid';
import { CalendarPicker } from './components/UI/CalendarPicker';
import { useKanbanData } from './hooks/useKanbanData';
import { useFileSystem } from './hooks/useFileSystem';
import { useDialog } from './hooks/useDialog';
import { useFileOperations } from './hooks/useFileOperations';
import { useTaskOperations } from './hooks/useTaskOperations';
import { GlobalDialogs } from './components/UI/GlobalDialogs';
import { Header } from './components/Layout/Header';

const App: React.FC = () => {
  // --- Data & State ---
  const {
    tasks, setTasks,
    categories, setCategories,
    events, setEvents,
    appName, setAppName,
    appIcon, setAppIcon,
    updateData, undo, redo
  } = useKanbanData();

  const fileSystem = useFileSystem();
  const { currentFileHandle, setCurrentFileHandle } = fileSystem;

  // View State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('1month');
  const [groupBy, setGroupBy] = useState<GroupByMode>('category');
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);

  // Hooks
  const { dialogOpen, dialogType, dialogProps, openDialog, closeDialog } = useDialog();

  const fileOps = useFileOperations({
    tasks, setTasks,
    categories, setCategories,
    events, setEvents,
    appName, setAppName,
    appIcon, setAppIcon,
    autoSaveEnabled, setAutoSaveEnabled,
    autoUpdateEnabled,
    ...fileSystem,
    openDialog, closeDialog
  });

  const taskOps = useTaskOperations({
    tasks, categories, events, appName, appIcon,
    setTasks, setCategories, setAppName, setAppIcon, setCurrentFileHandle,
    updateData, tryAutoSave: fileOps.tryAutoSave,
    groupBy, currentDate,
    openDialog, closeDialog,
    currentFileName: currentFileHandle?.name
  });

  // --- Keyboard Shortcuts (Undo/Redo) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          const newState = redo();
          if (newState) fileOps.tryAutoSave(newState);
        } else {
          e.preventDefault();
          const newState = undo();
          if (newState) fileOps.tryAutoSave(newState);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        const newState = redo();
        if (newState) fileOps.tryAutoSave(newState);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, fileOps, tasks, categories, events, autoSaveEnabled]);

  // --- Helpers ---
  const navigateDate = (direction: 'prev' | 'next') => {
    const monthsToAdd = 1;
    const factor = direction === 'next' ? 1 : -1;
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (monthsToAdd * factor));
    setCurrentDate(newDate);
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

  // --- Computed Columns ---
  const timelineColumns = useMemo(() => {
    if (groupBy === 'category') {
      return categories;
    } else {
      const distinctAssignees = Array.from(new Set(tasks.map(t => getTaskDisplayName(t)).filter(Boolean))) as string[];
      distinctAssignees.sort();
      const assigneeColumns = distinctAssignees.map(a => ({ id: a, name: a }));
      return [{ id: '__unassigned__', name: '担当者未設定' }, ...assigneeColumns];
    }
  }, [groupBy, categories, tasks]);

  // --- Render ---
  return (
    <div
      className="flex flex-col h-screen bg-slate-50 relative"
      onDragEnter={fileOps.handleGlobalDragEnter}
      onDragOver={fileOps.handleGlobalDragOver}
      onDragLeave={fileOps.handleGlobalDragLeave}
      onDrop={fileOps.handleGlobalDrop}
    >
      {/* File Import Overlay */}
      {fileOps.isDragFileOver && (
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

      <Header
        appName={appName}
        appIcon={appIcon}
        currentFileName={currentFileHandle?.name}
        showAutoSaveSuccess={fileOps.showAutoSaveSuccess}
        showAutoSaveError={fileOps.showAutoSaveError}
        onOpenSettings={taskOps.openSettings}
        onQuickSave={fileOps.handleQuickSave}
        onReload={fileOps.handleReload}
        onExport={fileOps.handleExport}
        onImportClick={fileOps.handleImportClick}
        fileInputRef={fileOps.fileInputRef}
        onImportFileChange={fileOps.handleImportFileChange}
        onNavigateDate={navigateDate}
        periodLabel={getPeriodLabel()}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isCompactMode={isCompactMode}
        setIsCompactMode={setIsCompactMode}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        onCreateTask={() => taskOps.handleCreateTask(new Date().toISOString().split('T')[0], categories[0]?.id || '')}
        onCreateEvent={taskOps.handleCreateEvent}
        openDialog={openDialog}
        closeDialog={closeDialog}
        tasks={tasks}
        setCurrentDate={setCurrentDate}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          <TimelineGrid
            tasks={tasks}
            columns={timelineColumns}
            currentDate={currentDate}
            viewMode={viewMode}
            groupBy={groupBy}
            events={events}
            onTaskClick={taskOps.handleEditTask}
            onEventClick={taskOps.handleEditEvent}
            onCellClick={taskOps.handleCreateTask}
            onTaskMove={taskOps.moveTask}
            onEventDateUpdate={taskOps.handleUpdateEventDate}
            onCategoryAdd={taskOps.addCategory}
            onCategoryUpdate={taskOps.updateCategory}
            onCategoryDelete={taskOps.deleteCategory}
            setDragGhost={setDragGhost}
            dragGhost={dragGhost}
            isCompactMode={isCompactMode}
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
      </div>

      <GlobalDialogs
        isOpen={dialogOpen}
        type={dialogType}
        props={dialogProps}
        onClose={closeDialog}
        categories={categories}
        currentDate={currentDate}
        saveTask={taskOps.saveTask}
        deleteTask={taskOps.deleteTask}
        saveEvent={taskOps.saveEvent}
        deleteEvent={taskOps.deleteEvent}
        duplicateEvent={taskOps.duplicateEvent}
      />
    </div>
  );
};

export default App;
