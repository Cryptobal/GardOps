import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter((t: Toast) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter((t: Toast) => t.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string) => {
    addToast({ title, description, type: 'success' });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    addToast({ title, description, type: 'error' });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    addToast({ title, description, type: 'warning' });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    addToast({ title, description, type: 'info' });
  }, [addToast]);

  // Compatibilidad con API tipo shadcn/ui
  // Permite usar: toast({ title, description, variant: 'destructive' | 'success' | 'warning' | 'info' })
  const toast = useCallback((opts: { title: string; description?: string; variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info' }) => {
    const { title, description, variant } = opts || ({} as any);
    const mapped: 'success' | 'error' | 'warning' | 'info' =
      variant === 'destructive' ? 'error'
      : variant === 'success' ? 'success'
      : variant === 'warning' ? 'warning'
      : 'info';
    addToast({ title, description, type: mapped });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    toast,
  };
} 