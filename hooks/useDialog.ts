import { useState, useCallback } from 'react';
import { DialogType, DialogOptions } from '../types';

export const useDialog = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<DialogType>('alert');
    const [dialogProps, setDialogProps] = useState<DialogOptions>({});

    const openDialog = useCallback((type: DialogType, options: DialogOptions = {}) => {
        setDialogType(type);
        setDialogProps(options);
        setDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setDialogProps({});
    }, []);

    return {
        dialogOpen,
        dialogType,
        dialogProps,
        openDialog,
        closeDialog
    };
};
