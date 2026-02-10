
import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { Button } from './UI/Button';
import { COLORS_LIST } from '../utils/colors';

interface EventFormProps {
    initialEvent?: Partial<CalendarEvent>;
    onSubmit: (event: Partial<CalendarEvent>) => void;
    onCancel: () => void;
    onDelete?: (id: string) => void;
    onDuplicate?: (event: Partial<CalendarEvent>) => void;
}

export const EventForm: React.FC<EventFormProps> = ({ initialEvent, onSubmit, onCancel, onDelete, onDuplicate }) => {
    const [title, setTitle] = useState(initialEvent?.title || '');
    const [startDate, setStartDate] = useState(initialEvent?.startDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(initialEvent?.endDate || new Date().toISOString().split('T')[0]);
    const [color, setColor] = useState(initialEvent?.color || 'bg-blue-500');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (startDate > endDate) {
            alert("開始日は終了日より前の日付にしてください。");
            return;
        }

        onSubmit({
            id: initialEvent?.id,
            title,
            startDate,
            endDate,
            color,
        });
    };

    const handleDuplicate = () => {
        if (!onDuplicate) return;
        onDuplicate({
            title,
            startDate,
            endDate,
            color,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">イベント名</label>
                    <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例：夏季休暇、プロジェクト期間..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">開始日</label>
                        <input
                            type="date"
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">終了日</label>
                        <input
                            type="date"
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">イベント色</label>
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

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                    {initialEvent?.id && onDelete && (
                        <Button variant="danger" type="button" onClick={() => onDelete(initialEvent.id!)}>
                            削除
                        </Button>
                    )}
                    {initialEvent?.id && onDuplicate && (
                        <Button variant="secondary" type="button" onClick={handleDuplicate}>
                            複製
                        </Button>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={onCancel}>キャンセル</Button>
                    <Button type="submit">保存</Button>
                </div>
            </div>
        </form>
    );
};
