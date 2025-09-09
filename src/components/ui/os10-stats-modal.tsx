import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Badge } from './badge';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, Clock } from 'lucide-react';
import { obtenerEstadisticasOS10 } from '@/lib/utils/os10-status';
import { OS10StatusBadge } from './os10-status-badge';

interface OS10StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  guardias: any[];
  tipo: 'por_vencer' | 'vencido' | 'sin_fecha' | null;
}

export function OS10StatsModal({ isOpen, onClose, guardias, tipo }: OS10StatsModalProps) {
  const estadisticas = obtenerEstadisticasOS10(guardias);
  
  const getTitulo = () => {
    switch (tipo) {
      case 'por_vencer':
        return 'OS10 Por Vencer';
      case 'vencido':
        return 'OS10 Vencidos';
      case 'sin_fecha':
        return 'Sin OS10';
      default:
        return 'Estadísticas OS10';
    }
  };

  const getIcon = () => {
    switch (tipo) {
      case 'por_vencer':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'vencido':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'sin_fecha':
        return <HelpCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getGuardiasFiltrados = () => {
    if (!tipo) return guardias;
    
    return guardias.filter(guardia => {
      const estado = guardia.fecha_os10 ? 
        (new Date(guardia.fecha_os10) < new Date() ? 'vencido' : 
         new Date(guardia.fecha_os10) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'por_vencer' : 'vigente') : 
        'sin_fecha';
      
      return estado === tipo;
    });
  };

  const guardiasFiltrados = getGuardiasFiltrados();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Resumen de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{estadisticas.vigentes}</div>
              <div className="text-sm text-muted-foreground">Vigentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{estadisticas.por_vencer}</div>
              <div className="text-sm text-muted-foreground">Por Vencer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{estadisticas.vencidos}</div>
              <div className="text-sm text-muted-foreground">Vencidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{estadisticas.sin_fecha}</div>
              <div className="text-sm text-muted-foreground">Sin Fecha</div>
            </div>
          </div>

          {/* Lista de guardias */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              Guardias {tipo ? `(${guardiasFiltrados.length})` : ''}
            </h3>
            
            {guardiasFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay guardias en esta categoría
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {guardiasFiltrados.map((guardia) => (
                  <div key={guardia.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">{guardia.nombre_completo}</div>
                      <div className="text-sm text-muted-foreground">{guardia.rut}</div>
                      {guardia.instalacion_asignada && (
                        <div className="text-xs text-muted-foreground">
                          {guardia.instalacion_asignada}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <OS10StatusBadge fechaOS10={guardia.fecha_os10} />
                      {guardia.fecha_os10 && (
                        <div className="text-xs text-muted-foreground">
                          Vence: {new Date(guardia.fecha_os10).toLocaleDateString('es-CL')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


