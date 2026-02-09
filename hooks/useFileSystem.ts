import { useState, useEffect } from 'react';
import { ExportData } from '../types';
import { saveFileHandle, getLastFileHandle } from '../utils/db';

export const useFileSystem = () => {
    const [currentFileHandle, setCurrentFileHandle] = useState<any>(null);

    const saveFileAs = (data: ExportData, filename: string) => {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            throw new Error("データのJSON変換またはダウンロードに失敗しました。");
        }
    };

    const saveFile = async (data: ExportData) => {
        if (!currentFileHandle) {
            throw new Error("保存先のファイルが指定されていません。");
        }

        try {
            const jsonString = JSON.stringify(data, null, 2);
            // Create a writable stream to the file
            const writable = await currentFileHandle.createWritable();
            // Write the contents
            await writable.write(jsonString);
            // Close the file
            await writable.close();
        } catch (error: any) {
            // Re-throw to be handled by UI component
            throw error;
        }
    };

    const readFile = (file: File): Promise<any> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = event.target?.result;
                    if (typeof json !== 'string') {
                        throw new Error("ファイルの読み込み結果が不正です。");
                    }
                    const data = JSON.parse(json);
                    resolve(data);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = () => reject(new Error("ファイルの読み取り時にエラーが発生しました。"));
            reader.readAsText(file);
        });
    };

    const pickFile = async (): Promise<{ file: File, handle: any }> => {
        if ('showOpenFilePicker' in window) {
            try {
                const [handle] = await (window as any).showOpenFilePicker({
                    types: [
                        {
                            description: 'JSON Files',
                            accept: {
                                'application/json': ['.json'],
                            },
                        },
                    ],
                    multiple: false
                });
                const file = await handle.getFile();
                return { file, handle };
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    throw err; // User cancelled
                }
                throw new Error("ファイル選択APIが利用できませんでした。");
            }
        } else {
            throw new Error("このブラウザはファイルシステムアクセスAPIをサポートしていません。");
        }
    };

    const reloadFile = async (): Promise<ExportData> => {
        if (!currentFileHandle) throw new Error("ファイルハンドルがありません。");

        // Permission check could be added here if needed
        /*
        const opts = { mode: 'read' };
        if ((await currentFileHandle.queryPermission(opts)) !== 'granted') {
           if ((await currentFileHandle.requestPermission(opts)) !== 'granted') {
             throw new Error("ファイルの読み取り権限がありません。");
           }
        }
        */

        const file = await currentFileHandle.getFile();
        return readFile(file);
    };

    // Auto-save handle to DB when it changes
    useEffect(() => {
        if (currentFileHandle) {
            saveFileHandle(currentFileHandle);
        }
    }, [currentFileHandle]);

    const restoreLastHandle = async () => {
        return await getLastFileHandle();
    };

    return {
        currentFileHandle,
        setCurrentFileHandle,
        saveFile,
        saveFileAs,
        readFile,
        pickFile,
        reloadFile,
        restoreLastHandle
    };
};
