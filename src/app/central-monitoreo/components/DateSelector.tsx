import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface DateSelectorProps {
  fecha: string;
  onFechaChange: (fecha: string) => void;
  onRefresh: () => void;
  autoRefresh: boolean;
  onAutoRefreshToggle: () => void;
}

export function DateSelector({ 
  fecha, 
  onFechaChange, 
  onRefresh, 
  autoRefresh, 
  onAutoRefreshToggle 
}: DateSelectorProps) {
  
  const cambiarFecha = (dias: number) => {
    const fechaActual = new Date(fecha);
    fechaActual.setDate(fechaActual.getDate() + dias);
    onFechaChange(fechaActual.toISOString().split('T')[0]);
  };

  const irAHoy = () => {
    // Usar la fecha actual en zona horaria de Chile
    const hoyChile = new Date().toLocaleString("en-CA", { timeZone: 'America/Santiago' }).split(',')[0];
    onFechaChange(hoyChile);
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha + 'T00:00:00');
    return {
      completa: date.toLocaleDateString('es-CL', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      corta: date.toLocaleDateString('es-CL', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      })
    };
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaFecha = e.target.value;
    if (nuevaFecha) {
      onFechaChange(nuevaFecha);
    }
  };

  const fechaFormateada = formatearFecha(fecha);
  
  return (
    <Card className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            📅 Selector de Fecha
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {fechaFormateada.corta}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Navegación de fechas */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => cambiarFecha(-1)}
              title="Día anterior"
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Input
              type="date"
              value={fecha}
              onChange={handleDateChange}
              className="flex-1 h-8 text-xs cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="Haz clic para abrir el calendario"
              style={{ 
                cursor: 'pointer',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                backgroundImage: 'none',
                position: 'relative',
                paddingRight: '0.5rem',
                paddingLeft: '0.5rem'
              }}
              onClick={(e) => {
                const target = e.target as HTMLInputElement;
                target.showPicker?.();
              }}
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => cambiarFecha(1)}
              title="Día siguiente"
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Controles de actualización */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={irAHoy}
              className="text-xs h-8 flex-1"
            >
              Hoy
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              title="Actualizar"
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={onAutoRefreshToggle}
              className="text-xs h-8 flex-1"
            >
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </Button>
          </div>
        </div>
        
        <style jsx>{`
          input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            background: none !important;
            width: 0 !important;
            height: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          input[type="date"]::-webkit-inner-spin-button,
          input[type="date"]::-webkit-outer-spin-button {
            display: none !important;
            -webkit-appearance: none !important;
            appearance: none !important;
          }
          input[type="date"]::-webkit-clear-button {
            display: none !important;
            -webkit-appearance: none !important;
            appearance: none !important;
          }
        `}</style>
      </div>
    </Card>
  );
}
