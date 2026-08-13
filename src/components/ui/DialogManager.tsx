import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDialog, ConfirmDialogProps } from './ConfirmDialog';

interface DialogContextType {
  showConfirm: (options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>) => Promise<boolean>;
  showDeleteConfirm: (itemName: string, itemType?: string) => Promise<boolean>;
  showFireConfirm: (employeeName: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialogs = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogs must be used within a DialogProvider');
  }
  return context;
};

interface DialogProviderProps {
  children: React.ReactNode;
}

interface DialogState extends Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'> {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const showConfirm = useCallback((options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        ...options,
        isOpen: true,
        resolve
      });
    });
  }, []);

  const showDeleteConfirm = useCallback((itemName: string, itemType: string = 'elemento') => {
    return showConfirm({
      title: `Elimina ${itemType}`,
      message: `Sei sicuro di voler eliminare "${itemName}"? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      type: 'danger',
      icon: 'delete'
    });
  }, [showConfirm]);

  const showFireConfirm = useCallback((employeeName: string) => {
    return showConfirm({
      title: 'Licenzia Dipendente',
      message: `Sei sicuro di voler licenziare ${employeeName}? Questa azione eliminerà completamente l'utente dal sistema e non può essere annullata.`,
      confirmText: 'Licenzia',
      cancelText: 'Annulla',
      type: 'danger',
      icon: 'fire'
    });
  }, [showConfirm]);

  const handleClose = useCallback(() => {
    if (dialog?.resolve) {
      dialog.resolve(false);
    }
    setDialog(null);
  }, [dialog]);

  const handleConfirm = useCallback(() => {
    if (dialog?.resolve) {
      dialog.resolve(true);
    }
    setDialog(null);
  }, [dialog]);

  const value = {
    showConfirm,
    showDeleteConfirm,
    showFireConfirm
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999]" style={{ isolation: 'isolate' }}>
          <ConfirmDialog
            {...dialog}
            isOpen={dialog.isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
          />
        </div>,
        document.body,
      )}
    </DialogContext.Provider>
  );
};
