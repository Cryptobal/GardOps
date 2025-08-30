'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Building2, Clock, User } from 'lucide-react';

interface AsignacionActual {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  rol_servicio_nombre: string;
  hora_inicio: string;
  hora_termino: string;
  nombre_puesto: string;
}

interface ConfirmacionReasignacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  guardiaNombre: string;
  asignacionActual: AsignacionActual;
  nuevaInstalacionNombre: string;
  nuevoRolServicioNombre: string;
}

export default function ConfirmacionReasignacionModal({
  isOpen,
  onClose,
  onConfirmar,
  guardiaNombre,
  asignacionActual,
  nuevaInstalacionNombre,
  nuevoRolServicioNombre
}: ConfirmacionReasignacionModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      await onConfirmar();
      onClose();
    } catch (error) {
      console.error('Error confirmando reasignación:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Confirmar Reasignación
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              El guardia <strong className="text-gray-900 dark:text-gray-100">{guardiaNombre}</strong> ya está asignado a:
            </p>
          </div>

          {/* Asignación Actual */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
              <Building2 className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-orange-900 dark:text-orange-200">
                  {asignacionActual.instalacion_nombre}
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  Puesto: {asignacionActual.nombre_puesto}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
              <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-orange-900 dark:text-orange-200">
                  {asignacionActual.rol_servicio_nombre}
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  {asignacionActual.hora_inicio} - {asignacionActual.hora_termino}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              ¿Quiere proceder con el cambio? Esto modificará la pauta en el otro turno asignado.
            </p>
          </div>

          {/* Nueva Asignación */}
          <div className="space-y-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Nueva asignación:
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <Building2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-blue-900 dark:text-blue-200">
                  {nuevaInstalacionNombre}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-blue-900 dark:text-blue-200">
                  {nuevoRolServicioNombre}
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleCancelar}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmar} 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Confirmar Cambio'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
