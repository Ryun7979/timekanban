

import React, { useState } from 'react';
import { Button } from './UI/Button';
import { APP_ICONS } from '../utils/icons';

interface SettingsFormProps {
    currentName: string;
    currentIcon: string;
    currentFileName?: string;
    isAutoSaveEnabled: boolean;
    onSave: (name: string, icon: string, autoSave: boolean) => void;
    onReset?: () => void;
    onCancel: () => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ currentName, currentIcon, currentFileName, isAutoSaveEnabled, onSave, onReset, onCancel }) => {
    const [name, setName] = useState(currentName);
    const [icon, setIcon] = useState(currentIcon);
    const [autoSave, setAutoSave] = useState(isAutoSaveEnabled);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(name, icon, autoSave); }} className="space-y-6">



            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">タイトル</label>
                <input
                    type="text"
                    required
                    maxLength={30}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="最大30文字"
                />
                <div className="text-right text-xs text-slate-400">
                    {name.length} / 30
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">アイコン</label>
                <div className="grid grid-cols-5 gap-2">
                    {Object.keys(APP_ICONS).map((iconKey) => (
                        <button
                            key={iconKey}
                            type="button"
                            onClick={() => setIcon(iconKey)}
                            className={`p-3 rounded-lg border-2 flex items-center justify-center transition-all ${icon === iconKey
                                ? 'border-blue-500 bg-blue-50 text-blue-600'
                                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                                }`}
                        >
                            {APP_ICONS[iconKey]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Auto Save Option */}
            <div className="flex items-center space-x-2 pt-2 pb-2">
                <input
                    type="checkbox"
                    id="autoSaveConfig"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoSaveConfig" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    変更を自動的にファイルへ保存する
                </label>
            </div>

            {/* Danger Zone */}
            {onReset && (
                <div className="pt-6 mt-6 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        危険な操作
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                        すべてのタスクと設定を削除し、アプリを初期状態に戻します。この操作は取り消せません。
                    </p>
                    <Button variant="danger" type="button" onClick={onReset} className="w-full text-sm">
                        データを初期化する
                    </Button>
                </div>
            )}

            {/* File Info Footer (Moved) */}
            <div className="mb-4 pt-4 text-center border-t border-dashed border-slate-200">
                <div className="text-xs text-slate-500 font-mono break-all leading-tight">
                    {currentFileName ? (
                        <>
                            <div className="font-bold mb-1">現在編集中のファイル:</div>
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 inline-block max-w-full">
                                {currentFileName}
                            </div>

                        </>
                    ) : (
                        <span className="italic text-slate-400">ファイル未保存</span>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={onCancel}>キャンセル</Button>
                <Button type="submit">保存</Button>
            </div>
        </form>
    );
};