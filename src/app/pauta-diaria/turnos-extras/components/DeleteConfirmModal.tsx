"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, DollarSign, Calendar, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TurnoExtra {
  id: string;
  guardia_nombre: string;
  guardia_apellido_paterno: string;
  guardia_rut: string;
  instalacion_nombre: string;
  nombre_puesto: string;
  fecha: string;
  estado: 'reemplazo' | 'ppc' | 'horas_extras';
  valor: number | string;
  source?: string;
  pauta_id?: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  turno: TurnoExtra | null;
  loading: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  turno,
  loading
}: DeleteConfirmModalProps) {
  if (!turno) return null;

  const getTipoTurno = () => {
    if (turno.source === 'horas_extras') return 'Horas Extras';
    if (turno.estado === 'reemplazo') return 'Turno Extra (Reemplazo)';
    if (turno.estado === 'ppc') return 'Turno Extra (PPC)';
    return 'Turno Extra';
  };

  const getTipoColor = () => {
    if (turno.source === 'horas_extras') return 'bg-blue-100 text-blue-800';
    if (turno.estado === 'reemplazo') return 'bg-green-100 text-green-800';
    if (turno.estado === 'ppc') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (valor: number | string) => {
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    return `$${Math.round(num).toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirmar Eliminación
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar este {turno.source === 'horas_extras' ? 'registro de horas extras' : 'turno extra'}?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del turno */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={getTipoColor()}>
                {getTipoTurno()}
              </Badge>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(turno.valor)}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {turno.guardia_nombre} {turno.guardia_apellido_paterno}
                </span>
              </div>
              <div className="text-gray-600">
                RUT: {turno.guardia_rut}
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{turno.instalacion_nombre}</span>
              </div>
              
              <div className="text-gray-600">
                Puesto: {turno.nombre_puesto}
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>
                  {format(new Date(turno.fecha), 'dd/MM/yyyy', { locale: es })}
                </span>
              </div>
            </div>
          </div>

          {/* Advertencia */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-medium">Advertencia:</p>
                <p>
                  {turno.source === 'horas_extras' 
                    ? 'Las horas extras se eliminarán de la pauta diaria y no se podrán recuperar.'
                    : 'El turno extra se eliminará permanentemente y se revertirá cualquier cobertura asociada.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
