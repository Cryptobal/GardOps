"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface StylishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
  loading?: boolean;
}

export default function StylishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  loading = false
}: StylishConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const getIconAndColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <XCircle className="h-8 w-8 text-red-500" />,
          confirmBg: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-200 dark:border-red-800',
          bgColor: 'bg-red-50 dark:bg-red-900/20'
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          confirmBg: 'bg-green-600 hover:bg-green-700',
          borderColor: 'border-green-200 dark:border-green-800',
          bgColor: 'bg-green-50 dark:bg-green-900/20'
        };
      case 'info':
        return {
          icon: <Info className="h-8 w-8 text-blue-500" />,
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          borderColor: 'border-blue-200 dark:border-blue-800',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        };
      default: // warning
        return {
          icon: <AlertTriangle className="h-8 w-8 text-amber-500" />,
          confirmBg: 'bg-amber-600 hover:bg-amber-700',
          borderColor: 'border-amber-200 dark:border-amber-800',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20'
        };
    }
  };

  const { icon, confirmBg, borderColor, bgColor } = getIconAndColors();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Icono */}
          <div className={`p-3 rounded-full ${bgColor} border-2 ${borderColor}`}>
            {icon}
          </div>
          
          {/* Mensaje */}
          <p className="text-center text-gray-600 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
          
          {/* Botones */}
          <div className="flex space-x-3 w-full pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading || isConfirming}
              className="flex-1"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || isConfirming}
              className={`flex-1 text-white ${confirmBg} transition-all duration-200 transform hover:scale-105`}
            >
              {loading || isConfirming ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando...</span>
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente que usa el hook
export function StylishConfirmProvider({ children, modal, onClose, onConfirm }: {
  children: React.ReactNode;
  modal: any;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      {children}
      <StylishConfirmModal
        isOpen={modal.isOpen}
        onClose={onClose}
        onConfirm={onConfirm}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        type={modal.type}
      />
    </>
  );
}
