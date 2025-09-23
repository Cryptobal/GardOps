import { useState } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
}

export function useStylishConfirm() {
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'warning' | 'danger' | 'info' | 'success';
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: 'Confirmar',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'warning'
  });

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        title: options.title || 'Confirmar',
        message: options.message,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        type: options.type || 'warning',
        onConfirm: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModal(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const close = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  return {
    confirm,
    close,
    modal
  };
}
