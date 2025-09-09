import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    onFechaChange(`${year}-${month}-${day}`);
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
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-2 sm:p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => cambiarFecha(-1)}
          title="Día anterior"
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 hidden sm:block" />
          <Input
            type="date"
            value={fecha}
            onChange={handleDateChange}
            className="w-32 sm:w-40 text-sm cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => cambiarFecha(1)}
          title="Día siguiente"
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={irAHoy}
          className="text-xs sm:text-sm h-8 sm:h-10"
        >
          Hoy
        </Button>
      </div>
      
      <div className="flex-1 text-center">
        <p className="text-sm sm:text-lg font-medium capitalize">
          <span className="sm:hidden">{fechaFormateada.corta}</span>
          <span className="hidden sm:inline">{fechaFormateada.completa}</span>
        </p>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          title="Actualizar"
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        
        <Button
          variant={autoRefresh ? "default" : "outline"}
          size="sm"
          onClick={onAutoRefreshToggle}
          className="text-xs sm:text-sm h-8 sm:h-10"
        >
          <span className="sm:hidden">Auto</span>
          <span className="hidden sm:inline">Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
        </Button>
      </div>
    </div>
  );
}
