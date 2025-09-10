/**
 * Modal para solicitar fecha de inicio de asignación
 * Compatible con lógica existente
 */

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { AlertTriangle, Calendar, User, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

interface ModalFechaInicioAsignacionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (fechaInicio: string, observaciones?: string) => void;
  guardiaNombre: string;
  guardiaInstalacionActual?: string;
  nuevaInstalacionNombre: string;
  nuevoRolServicioNombre: string;
  esReasignacion: boolean;
}

export default function ModalFechaInicioAsignacion({
  isOpen,
  onClose,
  onConfirmar,
  guardiaNombre,
  guardiaInstalacionActual,
  nuevaInstalacionNombre,
  nuevoRolServicioNombre,
  esReasignacion
}: ModalFechaInicioAsignacionProps) {
  
  const [fechaInicio, setFechaInicio] = useState(() => {
    // Por defecto, fecha actual en zona horaria local (Chile)
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  });
  
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirmar = async () => {
    if (!fechaInicio) {
      return;
    }
    
    console.log('🔍 [MODAL-FECHA] Confirmando con fecha:', {
      fechaSeleccionada: fechaInicio,
      fechaActual: new Date().toLocaleDateString('es-CL'),
      observaciones
    });
    
    setLoading(true);
    try {
      await onConfirmar(fechaInicio, observaciones || undefined);
      onClose();
    } catch (error) {
      console.error('Error en confirmación:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Resetear a fecha actual en zona horaria local (Chile)
      const hoy = new Date();
      const año = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const dia = String(hoy.getDate()).padStart(2, '0');
      setFechaInicio(`${año}-${mes}-${dia}`);
      setObservaciones('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            {esReasignacion ? 'Confirmar Reasignación' : 'Confirmar Asignación'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del guardia */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{guardiaNombre}</span>
            </div>
            
            {esReasignacion && guardiaInstalacionActual && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Actualmente en: <span className="font-medium">{guardiaInstalacionActual}</span>
              </div>
            )}
          </div>

          {/* Advertencia para reasignaciones */}
          {esReasignacion && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Esta acción terminará la asignación actual y creará una nueva asignación.
              </AlertDescription>
            </Alert>
          )}

          {/* Nueva instalación */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">Nueva Asignación</span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <div><strong>Instalación:</strong> {nuevaInstalacionNombre}</div>
              <div><strong>Rol:</strong> {nuevoRolServicioNombre}</div>
            </div>
          </div>

          {/* Campo fecha de inicio */}
          <div className="space-y-2">
            <Label htmlFor="fecha-inicio" className="text-sm font-medium">
              📅 Fecha de Inicio de Asignación *
            </Label>
            <Input
              id="fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              {esReasignacion 
                ? 'La asignación actual terminará el día anterior a esta fecha'
                : 'Fecha desde la cual el guardia estará asignado a esta instalación'
              }
            </p>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-sm font-medium">
              💬 Observaciones (opcional)
            </Label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Motivo de la asignación, comentarios adicionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none dark:border-gray-600 dark:bg-gray-800"
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={loading || !fechaInicio}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Asignando...
                </div>
              ) : (
                `${esReasignacion ? 'Reasignar' : 'Asignar'} Guardia`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
