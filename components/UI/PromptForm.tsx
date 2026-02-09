
import React, { useState } from 'react';
import { Button } from './Button';

interface PromptFormProps {
    defaultValue?: string;
    inputType?: string;
    onSubmit: (val: string) => void;
    onCancel: () => void;
}

export const PromptForm: React.FC<PromptFormProps> = ({ defaultValue, inputType = 'text', onSubmit, onCancel }) => {
    const [val, setVal] = useState(defaultValue || '');

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(val); }} className="space-y-4">
            <div className="relative">
                <input 
                    type={inputType}
                    autoFocus
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder={inputType === 'text' ? "入力してください" : ""}
                />
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onCancel}>キャンセル</Button>
                <Button type="submit" disabled={!val.trim()}>保存</Button>
            </div>
        </form>
    );
};
