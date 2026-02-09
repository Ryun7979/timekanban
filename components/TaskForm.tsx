
import React, { useState, useEffect } from 'react';
import { Task, Category, Subtask } from '../types';
import { Button } from './UI/Button';

import { COLORS_LIST } from '../utils/colors';

interface TaskFormProps {
  initialTask?: Partial<Task>;
  categories: Category[];
  onSubmit: (task: Partial<Task>) => void;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ initialTask, categories, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [date, setDate] = useState(initialTask?.date || new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(initialTask?.categoryId || categories[0]?.id || '');
  const [assignee, setAssignee] = useState(initialTask?.assignee || '');
  const [color, setColor] = useState(initialTask?.color || 'bg-blue-500');
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialTask?.subtasks || []);
  const [isCompleted, setIsCompleted] = useState(initialTask?.isCompleted || false);


  // Drag & Drop state
  const [draggedSubtaskIndex, setDraggedSubtaskIndex] = useState<number | null>(null);

  // If subtasks exist, rely on their status, not isCompleted flag for UI logic.
  useEffect(() => {
    if (subtasks.length > 0 && isCompleted) {
      setIsCompleted(false);
    }
  }, [subtasks.length, isCompleted]);



  const addSubtask = () => {
    setSubtasks([...subtasks, { id: crypto.randomUUID(), title: '', completed: false }]);
  };

  const updateSubtaskTitle = (id: string, text: string) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, title: text } : s));
  };

  const updateSubtaskAssignee = (id: string, assigneeName: string) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, assignee: assigneeName } : s));
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const toggleManualCompletion = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCompleted(!isCompleted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: initialTask?.id,
      title,
      description,
      date,
      categoryId,
      subtasks,
      assignee,
      color,
      isCompleted: subtasks.length === 0 ? isCompleted : false,
    });
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSubtaskIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent drag image or let default handle image show
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedSubtaskIndex === null) return;
    if (draggedSubtaskIndex === dropIndex) {
      setDraggedSubtaskIndex(null);
      return;
    }

    const newSubtasks = [...subtasks];
    const [movedItem] = newSubtasks.splice(draggedSubtaskIndex, 1);
    newSubtasks.splice(dropIndex, 0, movedItem);

    setSubtasks(newSubtasks);
    setDraggedSubtaskIndex(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：アプリ更新のお知らせ告知"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">予定日</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">責任者</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                type="text"
                className="w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="担当者名"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ラベル色</label>
            <div className="flex items-center gap-2 h-[42px]">
              {COLORS_LIST.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full ${c.value} transition-transform hover:scale-110 focus:outline-none ${color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="詳細を入力..."
          />
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-slate-700">チェックリスト</label>
            <div className="flex gap-2">

              <button
                type="button"
                onClick={addSubtask}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
              >
                + 項目を追加
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {subtasks.length === 0 && (
              <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-lg bg-white/50">
                <p className="text-xs text-slate-400 italic mb-3">チェックリスト項目がありません</p>

                <button
                  type="button"
                  onClick={toggleManualCompletion}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm flex items-center gap-2 mx-auto cursor-pointer select-none ${isCompleted
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
                    }`}
                >
                  {isCompleted ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      完了済み (クリックで未完了へ)
                    </>
                  ) : (
                    <>
                      <span className="w-4 h-4 rounded-full border border-slate-400"></span>
                      このタスクを完了にする
                    </>
                  )}
                </button>
                {isCompleted && <p className="text-[10px] text-emerald-600 mt-2 font-medium">✨ Ready! マークが表示されます</p>}
              </div>
            )}
            {subtasks.map((st, index) => (
              <div
                key={st.id}
                className={`flex items-center gap-2 group p-1 rounded transition-colors ${draggedSubtaskIndex === index ? 'bg-slate-100 opacity-60 border border-dashed border-slate-300' : 'hover:bg-white border border-transparent'}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Drag Handle */}
                <div
                  className="text-slate-300 cursor-grab hover:text-slate-500 p-1 flex-shrink-0"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  title="ドラッグして並び替え"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>

                <input
                  type="checkbox"
                  checked={st.completed}
                  onChange={() => toggleSubtask(st.id)}
                  className="rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <input
                  type="text"
                  value={st.title}
                  onChange={(e) => updateSubtaskTitle(st.id, e.target.value)}
                  className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-slate-300 outline-none min-w-[100px]"
                  placeholder="タスク項目..."
                />

                {/* サブタスク担当者入力 */}
                <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    value={st.assignee || ''}
                    onChange={(e) => updateSubtaskAssignee(st.id, e.target.value)}
                    className="w-20 bg-transparent text-xs text-slate-600 outline-none placeholder-slate-400"
                    placeholder="担当者"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeSubtask(st.id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <Button type="button" variant="secondary" onClick={onCancel}>キャンセル</Button>
        <Button type="submit">保存</Button>
      </div>
    </form>
  );
};
