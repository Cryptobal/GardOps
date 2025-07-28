"use client";

import * as React from "react";
import { X, CheckCircle, AlertCircle, XCircle, Info } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ToastProps {
  id: string;
  type?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
  onRemove: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const toastStyles = {
  success: "border-green-500/50 bg-green-500/10 text-green-500",
  error: "border-red-500/50 bg-red-500/10 text-red-500",
  warning: "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
  info: "border-blue-500/50 bg-blue-500/10 text-blue-500",
};

export function Toast({ id, type = "info", title, message, duration = 5000, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    setIsVisible(true);
    
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        handleRemove();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration]);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(id), 300);
  };

  const Icon = toastIcons[type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-300 min-w-[300px] max-w-[500px]",
        toastStyles[type],
        isVisible 
          ? "translate-x-0 opacity-100 scale-100" 
          : "translate-x-full opacity-0 scale-95"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      
      <div className="flex-1 space-y-1">
        {title && (
          <div className="font-semibold text-sm text-foreground">
            {title}
          </div>
        )}
        <div className="text-sm text-foreground/90">
          {message}
        </div>
      </div>

      <button
        onClick={handleRemove}
        className="flex-shrink-0 rounded-full p-1 hover:bg-background/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Hook para manejo de toasts
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastProps, "id" | "onRemove">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id, onRemove: removeToast }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = React.useMemo(() => ({
    success: (message: string, title?: string) => addToast({ type: "success", message, title }),
    error: (message: string, title?: string) => addToast({ type: "error", message, title }),
    warning: (message: string, title?: string) => addToast({ type: "warning", message, title }),
    info: (message: string, title?: string) => addToast({ type: "info", message, title }),
  }), [addToast]);

  return { toasts, toast, removeToast };
}

// Componente contenedor de toasts
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={removeToast} />
      ))}
    </div>
  );
} 