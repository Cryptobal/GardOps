"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { motion } from "framer-motion";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
};

// Componente de Header personalizable
export function ModalHeader({ 
  title, 
  onClose, 
  className 
}: { 
  title: string; 
  onClose: () => void; 
  className?: string; 
}) {
  return (
    <div className={cn("flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-muted/30", className)}>
      <h2 className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8 hover:bg-muted/50 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Componente de Footer personalizable
export function ModalFooter({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn(
      "sticky z-10 bottom-0 flex justify-end gap-3 px-6 py-4 bg-background/80 backdrop-blur-sm border-t border-muted/30",
      className
    )}>
      {children}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  const [canClose, setCanClose] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      devLogger.process('🔍 Modal: Abriendo modal, canClose será true en 300ms');
      document.body.style.overflow = "hidden";
      // Delay más largo para evitar que el click inicial cierre el modal
      const timer = setTimeout(() => {
        setCanClose(true);
        devLogger.process('🔍 Modal: Ahora se puede cerrar el modal');
      }, 300);
      return () => clearTimeout(timer);
    } else {
      devLogger.process('🔍 Modal: Cerrando modal');
      document.body.style.overflow = "unset";
      setCanClose(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop mejorado */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md backdrop-saturate-150"
        onClick={canClose ? () => {
          devLogger.process('🔍 Modal: Backdrop clickeado, cerrando modal');
          onClose();
        } : () => {
          devLogger.process('🔍 Modal: Backdrop clickeado pero canClose es false, ignorando');
        }}
      />

      {/* Modal con animaciones suaves */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "relative w-full mx-4 bg-background border border-border/50 rounded-2xl shadow-2xl",
          "shadow-black/25",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <ModalHeader title={title || ""} onClose={onClose} />
        )}

        {/* Content */}
        <div className="px-6 py-4">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// Hook para modal de confirmación (sin cambios)
export interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm?: () => Promise<void>;
}

export function useConfirmModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<ConfirmModalProps | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((options: ConfirmModalProps): Promise<boolean> => {
    devLogger.search(' useConfirmModal: confirm llamado con:', options);
    return new Promise((resolve) => {
      devLogger.process('🔍 useConfirmModal: configurando modal y abriendo');
      setConfig(options);
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    devLogger.process('🔍 useConfirmModal: handleConfirm ejecutado');
    resolveRef.current?.(true);
    setIsOpen(false);
    setConfig(null);
  }, []);

  const handleCancel = React.useCallback(() => {
    devLogger.process('🔍 useConfirmModal: handleCancel ejecutado');
    resolveRef.current?.(false);
    setIsOpen(false);
    setConfig(null);
  }, []);

  const ConfirmModal = () => {
    devLogger.search(' useConfirmModal: ConfirmModal renderizando, isOpen:', isOpen, 'config:', config);
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
          
          <ModalFooter>
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
          </ModalFooter>
        </div>
      </Modal>
    );
  };

  return { confirm, ConfirmModal };
} 