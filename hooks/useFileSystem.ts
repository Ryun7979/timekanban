import { useState, useEffect, useCallback, useRef } from 'react';
import { ExportData } from '../types';
import { saveFileHandle, getLastFileHandle } from '../utils/db';

export const useFileSystem = () => {
    const [currentFileHandle, setCurrentFileHandle] = useState<any>(null);

    const saveFileAs = useCallback((data: ExportData, filename: string) => {
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
    }, []);

    const saveFile = useCallback(async (data: ExportData, options?: { checkCollision?: boolean, lastModified?: number }) => {
        if (!currentFileHandle) {
            throw new Error("保存先のファイルが指定されていません。");
        }

        try {
            // Conflict Detection
            if (options?.checkCollision && options.lastModified) {
                const file = await currentFileHandle.getFile();
                if (file.lastModified > options.lastModified) {
                    const error: any = new Error("ファイルが外部で変更されています。上書きしますか？");
                    error.name = "FileCollisionError";
                    throw error;
                }
            }

            const jsonString = JSON.stringify(data, null, 2);
            const writable = await currentFileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();
        } catch (error: any) {
            throw error;
        }
    }, [currentFileHandle]);

    const readFile = useCallback((file: File): Promise<any> => {
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
    }, []);

    const pickFile = useCallback(async (): Promise<{ file: File, handle: any }> => {
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
    }, []);

    const reloadFile = useCallback(async (): Promise<ExportData> => {
        if (!currentFileHandle) throw new Error("ファイルハンドルがありません。");
        const file = await currentFileHandle.getFile();
        return readFile(file);
    }, [currentFileHandle, readFile]);

    const isInitialMount = useRef(true);

    // Auto-save handle to DB when it changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        saveFileHandle(currentFileHandle);
    }, [currentFileHandle]);

    const restoreLastHandle = useCallback(async () => {
        return await getLastFileHandle();
    }, []);

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
