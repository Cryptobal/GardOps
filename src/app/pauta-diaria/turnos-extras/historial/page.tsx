'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Download, DollarSign, RefreshCw, AlertTriangle, FileSpreadsheet, CheckCircle, Clock, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Planilla {
  id: number;
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

// Función para formatear números con puntos como separadores de miles sin decimales
const formatCurrency = (amount: number | string): string => {
  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export default function HistorialPlanillasPage() {
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [planillaSeleccionada, setPlanillaSeleccionada] = useState<Planilla | null>(null);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [descargando, setDescargando] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'all' | 'pendiente' | 'pagada'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

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

  // Descargar planilla
  const descargarPlanilla = async (planillaId: number) => {
    setDescargando(planillaId);
    try {
      const response = await fetch(`/api/pauta-diaria/turno-extra/planillas/${planillaId}/descargar`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Planilla_Turnos_Extras_${planillaId}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        success("📊 Planilla descargada", "Archivo XLSX descargado exitosamente");
      } else {
        const data = await response.json();
        error("❌ Error", data.error || "Error al descargar la planilla");
      }
    } catch (err) {
      console.error('Error:', err);
      error("❌ Error", "Error de conexión al descargar");
    } finally {
      setDescargando(null);
    }
  };

  // Marcar planilla como pagada
  const marcarPlanillaComoPagada = async (planillaId: number) => {
    setProcesandoPago(true);
    try {
      const response = await fetch(`/api/pauta-diaria/turno-extra/planillas/${planillaId}/marcar-pagada`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        success("✅ Planilla marcada como pagada", data.mensaje);
        setShowConfirmModal(false);
        setPlanillaSeleccionada(null);
        cargarPlanillas(pagination.page);
      } else {
        error("❌ Error", data.error || "Error al marcar planilla como pagada");
      }
    } catch (err) {
      console.error('Error:', err);
      error("❌ Error", "Error de conexión");
    } finally {
      setProcesandoPago(false);
    }
  };

  // Confirmar pago de planilla
  const confirmarPagoPlanilla = () => {
    if (planillaSeleccionada) {
      marcarPlanillaComoPagada(planillaSeleccionada.id);
    }
  };

  // Abrir modal de confirmación
  const abrirModalConfirmacion = (planilla: Planilla) => {
    setPlanillaSeleccionada(planilla);
    setShowConfirmModal(true);
  };

  // Cambiar página
  const cambiarPagina = (nuevaPagina: number) => {
    setPagination(prev => ({ ...prev, page: nuevaPagina }));
    cargarPlanillas(nuevaPagina);
  };

  // Obtener estado visual de la planilla
  const getEstadoPlanilla = (planilla: Planilla) => {
    if (planilla.estado === 'pagada') {
      return { texto: 'Pagada', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' };
    }
    return { texto: 'Pendiente', variant: 'secondary' as const, icon: Clock, color: 'text-orange-500' };
  };

  useEffect(() => {
    cargarPlanillas();
  }, [filtroEstado]);

  useEffect(() => {
    cargarPlanillas(pagination.page);
  }, [pagination.page]);

  return (
    <div className="container mx-auto p-6 space-y-6">
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
          <Button 
            onClick={() => window.location.href = '/pauta-diaria/turnos-extras'} 
            variant="outline" 
            size="sm"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Volver a Turnos Extras
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
                              Planilla #{planilla.id}
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

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(planilla.monto_total)}</div>
                            <div className="text-sm text-muted-foreground">
                              {planilla.cantidad_turnos} turno(s)
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => descargarPlanilla(planilla.id)}
                              size="sm"
                              variant="outline"
                              disabled={descargando === planilla.id}
                            >
                              {descargando === planilla.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Descargando...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Descargar XLSX
                                </>
                              )}
                            </Button>

                            {planilla.estado === 'pendiente' && (
                              <Button
                                onClick={() => abrirModalConfirmacion(planilla)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Marcar Pagada
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {planilla.observaciones && (
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Observaciones:
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {planilla.observaciones}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cambiarPagina(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Anterior
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => cambiarPagina(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmación */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pago de Planilla</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres marcar esta planilla como pagada?
              Esta acción marcará todos los turnos extras incluidos en la planilla como pagados.
            </DialogDescription>
          </DialogHeader>
          
          {planillaSeleccionada && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Detalles de la planilla:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Planilla #{planillaSeleccionada.id}</li>
                  <li>• Turnos incluidos: {planillaSeleccionada.cantidad_turnos}</li>
                  <li>• Monto total: {formatCurrency(planillaSeleccionada.monto_total)}</li>
                  <li>• Fecha de generación: {format(new Date(planillaSeleccionada.fecha_generacion), 'dd/MM/yyyy', { locale: es })}</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={procesandoPago}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarPagoPlanilla}
              disabled={procesandoPago}
              className="bg-green-600 hover:bg-green-700"
            >
              {procesandoPago ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Confirmar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 