"use client";

import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './alert-dialog';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface RutValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'duplicate' | 'info';
  title: string;
  message: string;
  rut?: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function RutValidationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  rut,
  onConfirm,
  confirmText = 'Entendido',
  cancelText = 'Cerrar'
}: RutValidationModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />;
      case 'duplicate':
        return <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />;
      case 'info':
        return <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />;
      default:
        return <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'duplicate':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'duplicate':
        return 'text-orange-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-blue-800';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className={`max-w-md ${getBackgroundColor()} border-2`}>
        <AlertDialogHeader className="text-center">
          {getIcon()}
          <AlertDialogTitle className={`text-xl font-bold ${getTextColor()}`}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className={`mt-2 ${getTextColor()} text-base`}>
            {message}
            {rut && (
              <div className="mt-3 p-3 bg-white/50 rounded-lg border">
                <span className="font-mono text-lg font-bold text-gray-700">
                  {rut}
                </span>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {onConfirm ? (
            <>
              <AlertDialogCancel className="w-full sm:w-auto">
                {cancelText}
              </AlertDialogCancel>
              <AlertDialogAction 
                className={`w-full sm:w-auto ${
                  type === 'duplicate' 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : type === 'error'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={handleConfirm}
              >
                {confirmText}
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction 
              className={`w-full ${
                type === 'success' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : type === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : type === 'duplicate'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={onClose}
            >
              {confirmText}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
