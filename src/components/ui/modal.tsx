"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center lg:items-center lg:justify-center p-4 lg:p-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full bg-background border border-border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto lg:max-h-none lg:overflow-visible",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            {title && (
              <h2 className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 lg:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// Hook para modal de confirmación
export interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export function useConfirmModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<ConfirmModalProps | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((options: ConfirmModalProps): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig(options);
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    setIsOpen(false);
    setConfig(null);
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    setIsOpen(false);
    setConfig(null);
  }, []);

  const ConfirmModal = React.useCallback(() => {
    if (!config) return null;

    const typeStyles = {
      danger: "border-red-500/20 bg-red-500/5",
      warning: "border-yellow-500/20 bg-yellow-500/5",
      info: "border-blue-500/20 bg-blue-500/5",
    };

    const confirmButtonStyles = {
      danger: "bg-red-600 hover:bg-red-700 text-white",
      warning: "bg-yellow-600 hover:bg-yellow-700 text-white",
      info: "bg-blue-600 hover:bg-blue-700 text-white",
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title={config.title || "Confirmar acción"}
        size="sm"
        className={typeStyles[config.type || "info"]}
      >
        <div className="space-y-6">
          <p className="text-foreground/90 leading-relaxed">
            {config.message}
          </p>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              {config.cancelText || "Cancelar"}
            </Button>
            <Button
              className={confirmButtonStyles[config.type || "info"]}
              onClick={handleConfirm}
            >
              {config.confirmText || "Confirmar"}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }, [isOpen, config, handleConfirm, handleCancel]);

  return { confirm, ConfirmModal };
} 