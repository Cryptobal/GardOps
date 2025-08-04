'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTurnosExtras } from '@/hooks/useTurnosExtras';

interface TurnosExtrasResumenProps {
  guardia_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  showExportButton?: boolean;
}

export function TurnosExtrasResumen({
  guardia_id,
  fecha_inicio,
  fecha_fin,
  showExportButton = true
}: TurnosExtrasResumenProps) {
  const [resumen, setResumen] = useState<any>(null);
  const { obtenerResumenTurnosExtras, isLoading } = useTurnosExtras();

  useEffect(() => {
    const cargarResumen = async () => {
      try {
        const data = await obtenerResumenTurnosExtras(guardia_id, fecha_inicio, fecha_fin);
        setResumen(data);
      } catch (error) {
        console.error('Error al cargar resumen:', error);
      }
    };

    cargarResumen();
  }, [guardia_id, fecha_inicio, fecha_fin]);

  const handleExportar = async () => {
    try {
      const params = new URLSearchParams();
      if (guardia_id) params.append('guardia_id', guardia_id);
      if (fecha_inicio) params.append('fecha_inicio', fecha_inicio);
      if (fecha_fin) params.append('fecha_fin', fecha_fin);
      params.append('formato', 'csv');

      const response = await fetch(`/api/pauta-diaria/turno-extra/exportar?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turnos_extras_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error al exportar:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando resumen...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!resumen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Turnos Extras</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No hay datos para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Resumen de Turnos Extras</CardTitle>
        {showExportButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportar}
            className="text-xs"
          >
            📊 Exportar CSV
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Turnos:</span>
              <Badge variant="secondary">{resumen.total_turnos}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Valor Total:</span>
              <Badge variant="default">${resumen.valor_total?.toLocaleString()}</Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Reemplazos:</span>
              <Badge variant="outline">
                {resumen.por_estado?.reemplazo || 0} (${resumen.valor_por_estado?.reemplazo || 0})
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">PPC:</span>
              <Badge variant="outline">
                {resumen.por_estado?.ppc || 0} (${resumen.valor_por_estado?.ppc || 0})
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 