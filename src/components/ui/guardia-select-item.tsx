"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { getAsignacionActivaGuardia } from '@/lib/api/instalaciones';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User, MapPin, Clock } from 'lucide-react';

interface GuardiaSelectItemProps {
  guardia: {
    id: string;
    nombre: string;
    apellido_paterno?: string;
    apellido_materno?: string;
  };
  isSelected?: boolean;
  onSelect?: (guardiaId: string) => void;
}

export function GuardiaSelectItem({ guardia, isSelected, onSelect }: GuardiaSelectItemProps) {
  const [asignacionActiva, setAsignacionActiva] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verificarAsignacionActiva = async () => {
      try {
        setLoading(true);
        const data = await getAsignacionActivaGuardia(guardia.id);
        if (data.tiene_asignacion) {
          setAsignacionActiva(data.asignacion);
        }
      } catch (error) {
        logger.error('Error verificando asignación activa::', error);
      } finally {
        setLoading(false);
      }
    };

    verificarAsignacionActiva();
  }, [guardia.id]);

  const nombreCompleto = `${guardia.apellido_paterno || ''} ${guardia.apellido_materno || ''}, ${guardia.nombre}`.trim();
  const tieneAsignacionActiva = asignacionActiva !== null;

  const handleClick = () => {
    if (tieneAsignacionActiva) {
      // No permitir selección si tiene asignación activa
      return;
    }
    onSelect?.(guardia.id);
  };

  const tooltipContent = tieneAsignacionActiva ? (
    <div className="space-y-2 p-2">
      <div className="font-medium text-sm">Asignación Activa:</div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span>{asignacionActiva.instalacion_nombre}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{asignacionActiva.rol_servicio_nombre}</span>
        </div>
        <div className="text-gray-500">
          Cliente: {asignacionActiva.cliente_nombre}
        </div>
      </div>
    </div>
  ) : (
    <div className="text-sm">Guardia disponible para asignación</div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
              ${tieneAsignacionActiva 
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                : isSelected 
                  ? 'bg-blue-100 text-blue-900' 
                  : 'hover:bg-gray-50'
              }
            `}
            onClick={handleClick}
          >
            <User className={`h-4 w-4 ${tieneAsignacionActiva ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className="flex-1 text-sm">{nombreCompleto}</span>
            {tieneAsignacionActiva && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                🔒 Asignado
              </span>
            )}
            {loading && (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
