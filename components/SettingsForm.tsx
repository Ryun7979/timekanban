

import React, { useState } from 'react';
import { Button } from './UI/Button';
import { APP_ICONS } from '../utils/icons';

interface SettingsFormProps {
    currentName: string;
    currentIcon: string;
    currentFileName?: string;
    onSave: (name: string, icon: string) => void;
    onReset?: () => void;
    onCancel: () => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ currentName, currentIcon, currentFileName, onSave, onReset, onCancel }) => {
    const [name, setName] = useState(currentName);
    const [icon, setIcon] = useState(currentIcon);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(name, icon); }} className="space-y-6">
            
            {/* File Info Section */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">現在編集中のファイル</label>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-mono break-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {currentFileName ? (
                        <span className="font-semibold">{currentFileName}</span>
                    ) : (
                        <span className="text-slate-400 italic">未保存 (新規またはメモリ内)</span>
                    )}
                </div>
            </div>

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
                            className={`p-3 rounded-lg border-2 flex items-center justify-center transition-all ${
                                icon === iconKey 
                                ? 'border-blue-500 bg-blue-50 text-blue-600' 
                                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                            }`}
                        >
                            {APP_ICONS[iconKey]}
                        </button>
                    ))}
                </div>
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

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={onCancel}>キャンセル</Button>
                <Button type="submit">保存</Button>
            </div>
        </form>
    );
};