"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HorasExtrasModalProps {
  pautaId: string;
  guardiaNombre?: string;
  instalacionNombre?: string;
  rolNombre?: string;
  montoActual?: number;
  onGuardar?: (monto: number) => void;
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export function HorasExtrasModal({
  pautaId,
  guardiaNombre,
  instalacionNombre,
  rolNombre,
  montoActual = 0,
  onGuardar,
  children,
  isOpen,
  onClose
}: HorasExtrasModalProps) {
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // Inicializar el monto cuando se abre el modal
  useEffect(() => {
    const modalOpen = isOpen !== undefined ? isOpen : open;
    if (modalOpen) {
      if (montoActual > 0) {
        // Formatear el monto actual con separadores de miles (sin decimales)
        const montoFormateado = Math.round(montoActual).toLocaleString('es-CL', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
        setMonto(montoFormateado);
      } else {
        setMonto('');
      }
    }
  }, [open, isOpen, montoActual]);

  // Función para formatear el input con separadores de miles (sin decimales)
  const formatearMonto = (valor: string) => {
    // Remover todo excepto números
    const soloNumeros = valor.replace(/\D/g, '');
    
    // Si está vacío, retornar vacío
    if (!soloNumeros) return '';
    
    // Formatear con separadores de miles (sin decimales)
    const numero = parseInt(soloNumeros, 10);
    return numero.toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Función para limpiar el monto (quitar separadores)
  const limpiarMonto = (valor: string) => {
    return valor.replace(/\D/g, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpio = limpiarMonto(e.target.value);
    const valorFormateado = formatearMonto(valorLimpio);
    setMonto(valorFormateado);
  };

  const handleGuardar = async () => {
    const montoNumerico = parseInt(limpiarMonto(monto), 10) || 0;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/pauta-diaria/horas-extras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pauta_id: pautaId,
          monto_horas_extras: montoNumerico
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar horas extras');
      }

      const result = await response.json();
      
      addToast({
        title: "✅ Horas extras guardadas",
        description: `Se guardaron $${montoNumerico.toLocaleString('es-CL', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })} en horas extras`,
        type: "success"
      });

      // Llamar callback si existe
      if (onGuardar) {
        onGuardar(montoNumerico);
      }

      if (onClose) {
        onClose();
      } else {
        setOpen(false);
      }
      
    } catch (error) {
      console.error('Error al guardar horas extras:', error);
      addToast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al guardar horas extras",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    if (montoActual > 0) {
      // Formatear el monto actual con separadores de miles (sin decimales)
      const montoFormateado = Math.round(montoActual).toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      setMonto(montoFormateado);
    } else {
      setMonto('');
    }
    if (onClose) {
      onClose();
    } else {
      setOpen(false);
    }
  };

  const handleEliminar = async () => {
    if (!montoActual || montoActual <= 0) {
      addToast({
        title: "❌ Error",
        description: "No hay horas extras para eliminar",
        type: "error"
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/pauta-diaria/horas-extras/eliminar?pauta_id=${pautaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar horas extras');
      }

      const result = await response.json();
      
      addToast({
        title: "✅ Horas extras eliminadas",
        description: `Se eliminaron $${Math.round(montoActual).toLocaleString('es-CL', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })} en horas extras`,
        type: "success"
      });

      // Llamar callback si existe
      if (onGuardar) {
        onGuardar(0); // 0 indica que se eliminaron
      }

      if (onClose) {
        onClose();
      } else {
        setOpen(false);
      }
      
    } catch (error) {
      console.error('Error al eliminar horas extras:', error);
      addToast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al eliminar horas extras",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen !== undefined ? isOpen : open} onOpenChange={onClose || setOpen}>
      {children && (
        <DialogTrigger asChild>
          <div>{children}</div>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-green-600" />
            Horas Extras
          </DialogTitle>
          <DialogDescription>
            Asignar horas extras al guardia del turno
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Información del turno */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-1">
            <div className="text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">Guardia:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {guardiaNombre || 'Sin asignar'}
              </span>
            </div>
            {instalacionNombre && (
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Instalación:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">{instalacionNombre}</span>
              </div>
            )}
            {rolNombre && (
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Rol:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">{rolNombre}</span>
              </div>
            )}
          </div>

          {/* Campo de monto */}
          <div className="space-y-2">
            <Label htmlFor="monto-horas-extras" className="text-sm font-medium">
              Monto de horas extras
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="monto-horas-extras"
                type="text"
                placeholder="0"
                value={monto}
                onChange={handleInputChange}
                className="pl-10 text-base"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ingresa el monto sin decimales (ej: 15000)
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2 justify-between pt-2">
            {/* Botón eliminar (solo si hay horas extras) */}
            {montoActual > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEliminar}
                disabled={loading}
                className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <X className="h-3 w-3 mr-1" />
                {loading ? 'Eliminando...' : 'Eliminar'}
              </Button>
            )}
            
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelar}
                disabled={loading}
                className="text-sm"
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleGuardar}
                disabled={loading}
                className="text-sm bg-green-600 hover:bg-green-700"
              >
                <Save className="h-3 w-3 mr-1" />
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
