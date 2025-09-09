"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Eliminar",
  cancelText = "Cancelar"
}: ConfirmDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      logger.error('Error en confirmación::', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto transform transition-all duration-300 ease-out">
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50 rounded-xl overflow-hidden">
          <CardHeader className="relative pb-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="absolute right-3 top-3 h-8 w-8 p-0 hover:bg-red-100 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-800">
                {title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <p className="text-gray-700 leading-relaxed font-medium">
              {message}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 h-10 text-sm font-semibold hover:bg-gray-100 border-gray-300 hover:border-gray-400 transition-all"
              >
                {cancelText}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 h-10 text-sm font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </div>
                ) : (
                  <span>{confirmText}</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 