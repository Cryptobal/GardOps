/**
 * Modal para confirmar reasignación cuando hay conflicto
 */

"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { AlertTriangle, User, Calendar, Building2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

interface ConflictoAsignacion {
  guardia_id: string;
  guardia_nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  puesto_nombre: string;
  instalacion_nombre: string;
}

interface ModalConflictoAsignacionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  nuevoGuardiaNombre: string;
  conflicto: ConflictoAsignacion;
  loading?: boolean;
}

export default function ModalConflictoAsignacion({
  isOpen,
  onClose,
  onConfirmar,
  nuevoGuardiaNombre,
  conflicto,
  loading = false
}: ModalConflictoAsignacionProps) {
  
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Conflicto de Asignación
          </DialogTitle>
          <DialogDescription>
            El puesto ya está asignado a otro guardia. ¿Deseas continuar con la reasignación?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Advertencia principal */}
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Advertencia:</strong> Esta acción terminará la asignación actual y creará una nueva asignación.
            </AlertDescription>
          </Alert>

          {/* Información del guardia actual */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800 dark:text-red-200">Asignación Actual</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-red-500" />
                <span className="text-red-700 dark:text-red-300">
                  <strong>Guardia:</strong> {conflicto.guardia_nombre}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-red-500" />
                <span className="text-red-700 dark:text-red-300">
                  <strong>Puesto:</strong> {conflicto.puesto_nombre}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-red-500" />
                <span className="text-red-700 dark:text-red-300">
                  <strong>Instalación:</strong> {conflicto.instalacion_nombre}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-red-500" />
                <span className="text-red-700 dark:text-red-300">
                  <strong>Desde:</strong> {formatearFecha(conflicto.fecha_inicio)}
                </span>
              </div>
              
              {conflicto.fecha_fin && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-red-500" />
                  <span className="text-red-700 dark:text-red-300">
                    <strong>Hasta:</strong> {formatearFecha(conflicto.fecha_fin)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Información de la nueva asignación */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">Nueva Asignación</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-green-500" />
                <span className="text-green-700 dark:text-green-300">
                  <strong>Guardia:</strong> {nuevoGuardiaNombre}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-green-500" />
                <span className="text-green-700 dark:text-green-300">
                  <strong>Puesto:</strong> {conflicto.puesto_nombre}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-green-500" />
                <span className="text-green-700 dark:text-green-300">
                  <strong>Instalación:</strong> {conflicto.instalacion_nombre}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirmar}
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? 'Procesando...' : 'Confirmar Reasignación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

