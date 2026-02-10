import React from 'react';
import { DialogType, DialogOptions, Task, Category, CalendarEvent } from '../../types';
import { Dialog } from './Dialog';
import { TaskForm } from '../TaskForm';
import { EventForm } from '../EventForm';
import { Button } from './Button';
import { CalendarPicker } from './CalendarPicker';
import { PromptForm } from './PromptForm';
import { SettingsForm } from '../SettingsForm';
import { DEFAULT_APP_NAME, DEFAULT_APP_ICON } from '../../utils/constants';

interface GlobalDialogsProps {
    isOpen: boolean;
    type: DialogType;
    props: DialogOptions;
    onClose: () => void;
    categories: Category[];
    currentDate: Date;
    saveTask: (task: Partial<Task>) => void;
    deleteTask: (taskId: string) => void;
    saveEvent: (event: Partial<CalendarEvent>) => void;
    deleteEvent: (eventId: string) => void;
    duplicateEvent: (event: Partial<CalendarEvent>) => void;
}

export const GlobalDialogs: React.FC<GlobalDialogsProps> = ({
    isOpen,
    type,
    props,
    onClose,
    categories,
    currentDate,
    saveTask,
    deleteTask,
    saveEvent,
    deleteEvent,
    duplicateEvent
}) => {
    if (!isOpen) return null;

    const renderDialogContent = () => {
        switch (type) {
            case 'alert':
                return (
                    <div className="space-y-4">
                        <p className="text-slate-600 whitespace-pre-wrap">{props.message}</p>
                        <div className="flex justify-end">
                            <Button onClick={onClose}>OK</Button>
                        </div>
                    </div>
                );
            case 'confirm':
                return (
                    <div className="space-y-4">
                        <p className="whitespace-pre-wrap text-slate-600">{props.message}</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={onClose}>キャンセル</Button>
                            <Button variant="danger" onClick={() => props.onConfirm?.()}>OK</Button>
                        </div>
                    </div>
                );
            case 'prompt':
                return (
                    <PromptForm
                        defaultValue={props.defaultText}
                        inputType={props.inputType}
                        onSubmit={(val) => props.onConfirm?.(val)}
                        onCancel={onClose}
                    />
                );
            case 'settings':
                return (
                    <SettingsForm
                        currentName={props.currentAppName || DEFAULT_APP_NAME}
                        currentIcon={props.currentAppIcon || DEFAULT_APP_ICON}
                        currentFileName={props.currentFileName}
                        onSave={(name, icon) => props.onSettingsSave?.(name, icon)}
                        onReset={props.onResetData}
                        onCancel={onClose}
                    />
                );
            case 'event-form':
                return (
                    <EventForm
                        initialEvent={props.event}
                        onSubmit={saveEvent}
                        onCancel={onClose}
                        onDelete={props.event?.id ? deleteEvent : undefined}
                        onDuplicate={props.event?.id ? duplicateEvent : undefined}
                    />
                );
            case 'task-form':
                return (
                    <div>
                        <TaskForm
                            initialTask={props.task}
                            categories={categories}
                            onSubmit={saveTask}
                            onCancel={onClose}
                        />
                        {props.task?.id && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-start">
                                <Button variant="danger" className="text-sm px-2 py-1" onClick={() => deleteTask(props.task!.id)}>タスクを削除</Button>
                            </div>
                        )}
                    </div>
                );
            case 'calendar':
                return (
                    <CalendarPicker
                        initialDate={currentDate}
                        tasks={props.tasks || []}
                        onSelect={(dateStr) => props.onConfirm?.(dateStr)}
                        onCancel={onClose}
                    />
                );
            default:
                return null;
        }
    };

    const getTitle = () => {
        if (props.title) return props.title;
        if (type === 'task-form') return props.task?.id ? 'タスク編集' : '新規タスク';
        return '';
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={getTitle()}
            width={type === 'task-form' ? 'max-w-xl' : undefined}
        >
            {renderDialogContent()}
        </Dialog>
    );
};
