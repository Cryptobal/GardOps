import { Authorize, GuardButton, can } from '@/lib/authz-ui'
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, FileSpreadsheet, Download, CheckCircle, Clock, Trash2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Planilla {
  id: number;
  codigo?: string;
  fecha_generacion: string;
  monto_total: number;
  cantidad_turnos: number;
  estado: 'pendiente' | 'pagada';
  fecha_pago: string | null;
  observaciones: string | null;
  usuario_nombre: string;
  usuario_apellido: string;
  fecha_inicio_turnos?: string;
  fecha_fin_turnos?: string;
}

export default function HistorialPlanillas() {
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'all' | 'pendiente' | 'pagada'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [procesandoAccion, setProcesandoAccion] = useState<number | null>(null);

  const { success, error } = useToast();

  // Cargar planillas
  const cargarPlanillas = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      if (filtroEstado !== 'all') {
        params.append('estado', filtroEstado);
      }

      const response = await fetch(`/api/pauta-diaria/turno-extra/planillas?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setPlanillas(data.planillas || []);
        setPagination(data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        });
      } else {
        error("Error", data.error || "Error al cargar planillas");
      }
    } catch (err) {
      console.error('Error:', err);
      error("Error", "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  // Descargar planilla XLSX
  const descargarPlanilla = async (planillaId: number) => {
    setProcesandoAccion(planillaId);
    try {
      const response = await fetch(`/api/pauta-diaria/turno-extra/planillas/${planillaId}/descargar`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Planilla_Turnos_Extras_${planillaId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        success("Éxito", "Planilla descargada correctamente");
      } else {
        const data = await response.json();
        error("Error", data.error || "Error al descargar planilla");
      }
    } catch (err) {
      console.error('Error:', err);
      error("Error", "Error al descargar planilla");
    } finally {
      setProcesandoAccion(null);
    }
  };

  // Marcar planilla como pagada
  const marcarComoPagada = async (planillaId: number) => {
    setProcesandoAccion(planillaId);
    try {
      const response = await fetch(`/api/pauta-diaria/turno-extra/planillas/${planillaId}/marcar-pagada`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        success("Éxito", "Planilla marcada como pagada correctamente");
        cargarPlanillas(); // Recargar para actualizar el estado
      } else {
        error("Error", data.error || "Error al marcar planilla como pagada");
      }
    } catch (err) {
      console.error('Error:', err);
      error("Error", "Error de conexión");
    } finally {
      setProcesandoAccion(null);
    }
  };

  // Eliminar planilla
  const eliminarPlanilla = async (planillaId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta planilla? Esta acción no se puede deshacer.')) {
      return;
    }

    setProcesandoAccion(planillaId);
    try {
      const response = await fetch(`/api/pauta-diaria/turno-extra/planillas/${planillaId}/eliminar`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        success("Éxito", "Planilla eliminada correctamente");
        cargarPlanillas(); // Recargar para actualizar la lista
      } else {
        error("Error", data.error || "Error al eliminar planilla");
      }
    } catch (err) {
      console.error('Error:', err);
      error("Error", "Error de conexión");
    } finally {
      setProcesandoAccion(null);
    }
  };

  // Obtener estado visual de la planilla
  const getEstadoPlanilla = (planilla: Planilla) => {
    if (planilla.estado === 'pagada') {
      return { texto: 'Pagada', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' };
    }
    return { texto: 'Pendiente', variant: 'secondary' as const, icon: Clock, color: 'text-orange-500' };
  };

  // Cambiar página
  const cambiarPagina = (nuevaPagina: number) => {
    setPagination(prev => ({ ...prev, page: nuevaPagina }));
    cargarPlanillas(nuevaPagina);
  };

  useEffect(() => {
    cargarPlanillas();
  }, [filtroEstado]);

  useEffect(() => {
    cargarPlanillas(pagination.page);
  }, [pagination.page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Historial de Planillas</h1>
          <p className="text-muted-foreground">
            Gestión de planillas de turnos extras generadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => cargarPlanillas()} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Estado:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as 'all' | 'pendiente' | 'pagada')}
                className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-900"
              >
                <option value="all">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="pagada">Pagadas</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Planillas */}
      <Card>
        <CardHeader>
          <CardTitle>Planillas Generadas</CardTitle>
          <CardDescription>
            {planillas.length} planilla(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : planillas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay planillas para mostrar</p>
              <p className="text-sm">Genera planillas desde la página de turnos extras</p>
            </div>
          ) : (
            <div className="space-y-4">
              {planillas.map((planilla) => {
                const estadoPlanilla = getEstadoPlanilla(planilla);
                const EstadoIcon = estadoPlanilla.icon;
                const isProcesando = procesandoAccion === planilla.id;
                
                return (
                  <Card key={planilla.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <EstadoIcon className={cn("h-5 w-5", estadoPlanilla.color)} />
                            <Badge variant={estadoPlanilla.variant}>
                              {estadoPlanilla.texto}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="font-medium">
                              {planilla.codigo || `Planilla #${planilla.id}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Generada el {format(new Date(planilla.fecha_generacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                              {planilla.fecha_pago && (
                                <span className="ml-2">
                                  • Pagada el {format(new Date(planilla.fecha_pago), 'dd/MM/yyyy HH:mm', { locale: es })}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Por: {planilla.usuario_nombre} {planilla.usuario_apellido}
                            </div>
                            {planilla.fecha_inicio_turnos && planilla.fecha_fin_turnos && (
                              <div className="text-sm text-muted-foreground">
                                Turnos: {format(new Date(planilla.fecha_inicio_turnos), 'dd/MM/yyyy', { locale: es })} - {format(new Date(planilla.fecha_fin_turnos), 'dd/MM/yyyy', { locale: es })}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-medium">
                              {new Intl.NumberFormat('es-CL', {
                                style: 'currency',
                                currency: 'CLP'
                              }).format(planilla.monto_total)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {planilla.cantidad_turnos} turno(s)
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            {/* Botón Descargar XLSX */}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => descargarPlanilla(planilla.id)}
                              disabled={isProcesando}
                              title="Descargar XLSX"
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            {/* Botón Marcar como Pagada (solo si está pendiente) */}
                            {planilla.estado === 'pendiente' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => marcarComoPagada(planilla.id)}
                                disabled={isProcesando}
                                className="text-green-600 hover:text-green-700"
                                title="Marcar como pagada"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Botón Eliminar (solo si está pendiente) */}
                            {planilla.estado === 'pendiente' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => eliminarPlanilla(planilla.id)}
                                disabled={isProcesando}
                                className="text-red-600 hover:text-red-700"
                                title="Eliminar planilla"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
