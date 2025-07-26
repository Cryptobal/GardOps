"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { Button } from './button'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  type?: 'error' | 'success' | 'info' | 'warning'
  confirmText?: string
  onConfirm?: () => void
}

export function AlertDialog({
  open,
  onOpenChange,
  title = 'Atención',
  description = '',
  type = 'error',
  confirmText = 'OK',
  onConfirm
}: AlertDialogProps) {
  const handleConfirm = () => {
    onConfirm?.()
    onOpenChange(false)
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-amber-500" />
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />
      default:
        return <AlertCircle className="h-6 w-6 text-red-500" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300'
      case 'error':
        return 'text-red-700 dark:text-red-300'
      case 'warning':
        return 'text-amber-700 dark:text-amber-300'
      case 'info':
        return 'text-blue-700 dark:text-blue-300'
      default:
        return 'text-red-700 dark:text-red-300'
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform"
          >
            <div className="bg-background border border-border rounded-xl shadow-2xl p-6 mx-4">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 mt-1">
                  {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {title}
                  </h3>
                  {description && (
                    <div className={`text-sm leading-relaxed ${getColors()}`}>
                      {description.split('\n').map((line, index) => (
                        <div key={index} className="mb-1">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors"
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Hook para usar AlertDialog fácilmente
export function useAlertDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean
    title?: string
    description?: string
    type?: 'error' | 'success' | 'info' | 'warning'
    confirmText?: string
    onConfirm?: () => void
  }>({
    open: false
  })

  const showAlert = (
    description: string,
    options?: {
      title?: string
      type?: 'error' | 'success' | 'info' | 'warning'
      confirmText?: string
      onConfirm?: () => void
    }
  ) => {
    setDialogState({
      open: true,
      description,
      title: options?.title || 'Atención',
      type: options?.type || 'error',
      confirmText: options?.confirmText || 'OK',
      onConfirm: options?.onConfirm
    })
  }

  const showError = (description: string, title = 'Error') => {
    showAlert(description, { title, type: 'error' })
  }

  const showSuccess = (description: string, title = 'Éxito') => {
    showAlert(description, { title, type: 'success' })
  }

  const showInfo = (description: string, title = 'Información') => {
    showAlert(description, { title, type: 'info' })
  }

  const showWarning = (description: string, title = 'Advertencia') => {
    showAlert(description, { title, type: 'warning' })
  }

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, open: false }))
  }

  return {
    showAlert,
    showError,
    showSuccess,
    showInfo,
    showWarning,
    AlertDialog: () => (
      <AlertDialog
        {...dialogState}
        onOpenChange={closeDialog}
      />
    )
  }
} 