'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Download, ArrowLeft, FileSpreadsheet, Calendar, DollarSign, RefreshCw, AlertTriangle, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import NavigationTabs from '../components/NavigationTabs';

interface Planilla {
  id: number;
  fecha_creacion: string;
  cantidad_turnos: number;
  monto_total: number | string;
  observaciones: string | null;
  usuario_creador: string | null;
  estado: 'activa' | 'archivada' | 'pagada';
  turnos_ids: string[];
}

// Función para formatear números con puntos como separadores de miles sin decimales
const formatCurrency = (amount: number | string): string => {
  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export default function HistorialPage() {
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState<number | null>(null);
  const [procesandoAccion, setProcesandoAccion] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planillaToDelete, setPlanillaToDelete] = useState<Planilla | null>(null);

  const { success, error } = useToast();

  // Cargar planillas
  const cargarPlanillas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra/planillas');
      const data = await response.json();

      if (response.ok) {
        setPlanillas(data.planillas || []);
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
        a.download = `planilla_turnos_extras_${planillaId}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        success("📊 Planilla descargada", "Archivo descargado exitosamente");
      } else {
        error("❌ Error", "Error al descargar la planilla");
      }
    } catch (err) {
      console.error('Error:', err);
      error("❌ Error", "Error de conexión");
    } finally {
      setDescargando(null);
    }
  };

  // Abrir modal de eliminación
  const abrirModalEliminar = (planilla: Planilla) => {
    setPlanillaToDelete(planilla);
    setShowDeleteModal(true);
  };

  // Cerrar modal de eliminación
  const cerrarModalEliminar = () => {
    setShowDeleteModal(false);
    setPlanillaToDelete(null);
  };

  // Eliminar planilla
  const eliminarPlanilla = async () => {
    if (!planillaToDelete) return;

    setProcesandoAccion(planillaToDelete.id);
    try {
      const response = await fetch(`/api/pauta-diaria/turno-extra/planillas/${planillaToDelete.id}/eliminar`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        success("✅ Planilla eliminada", "Planilla eliminada correctamente. Los turnos extras han vuelto a estado 'no pagado'.");
        cargarPlanillas(); // Recargar para actualizar la lista
        cerrarModalEliminar();
      } else {
        error("❌ Error", data.error || "Error al eliminar planilla");
      }
    } catch (err) {
      console.error('Error:', err);
      error("❌ Error", "Error de conexión");
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
        success("✅ Planilla pagada", "Planilla marcada como pagada correctamente");
        cargarPlanillas(); // Recargar para actualizar el estado
      } else {
        error("❌ Error", data.error || "Error al marcar planilla como pagada");
      }
    } catch (err) {
      console.error('Error:', err);
      error("❌ Error", "Error de conexión");
    } finally {
      setProcesandoAccion(null);
    }
  };

  // Función para manejar el cambio de pestañas
  const handleTabChange = (tab: 'turnos' | 'dashboard' | 'historial') => {
    if (tab === 'turnos') {
      window.location.href = '/pauta-diaria/turnos-extras';
    } else if (tab === 'dashboard') {
      window.location.href = '/pauta-diaria/turnos-extras/dashboard';
    }
  };

  // Obtener estado visual de la planilla
  const getEstadoPlanilla = (planilla: Planilla) => {
    if (planilla.estado === 'pagada') {
      return { texto: 'Pagada', variant: 'default' as const, color: 'text-green-500' };
    }
    if (planilla.estado === 'activa') {
      return { texto: 'Activa', variant: 'secondary' as const, color: 'text-blue-500' };
    }
    return { texto: 'Archivada', variant: 'secondary' as const, color: 'text-gray-500' };
  };

  useEffect(() => {
    cargarPlanillas();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Tabs */}
      <NavigationTabs activeTab="historial" onTabChange={handleTabChange} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        {/* Espacio reservado para futuras funcionalidades */}
      </div>

      {/* Lista de Planillas */}
      <Card>
        <CardHeader>
          <CardTitle>Planillas Generadas</CardTitle>
          <CardDescription>
            Lista de planillas de turnos extras ({planillas.length} planillas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : planillas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay planillas para mostrar</p>
              <p className="text-sm">Genera planillas desde la sección de turnos extras</p>
            </div>
          ) : (
            <div className="space-y-4">
              {planillas.map((planilla) => {
                const estadoPlanilla = getEstadoPlanilla(planilla);
                const isProcesando = procesandoAccion === planilla.id;
                const isPagada = planilla.estado === 'pagada';
                
                return (
                  <Card 
                    key={planilla.id} 
                    className={cn(
                      "border-l-4",
                      isPagada ? "border-l-green-500" : "border-l-blue-500"
                    )}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className={cn("h-5 w-5", isPagada ? "text-green-600" : "text-blue-600")} />
                            <div>
                              <h3 className="font-semibold">Planilla #{planilla.id}</h3>
                              <p className="text-sm text-muted-foreground">
                                Creada el {format(new Date(planilla.fecha_creacion), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {planilla.cantidad_turnos} turno(s)
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {formatCurrency(planilla.monto_total)}
                              </span>
                            </div>
                            
                            <Badge variant={estadoPlanilla.variant} className={estadoPlanilla.color}>
                              {estadoPlanilla.texto}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {/* Botón Eliminar (solo si no está pagada) */}
                          {!isPagada && (
                            <Button
                              onClick={() => abrirModalEliminar(planilla)}
                              size="sm"
                              variant="outline"
                              disabled={isProcesando}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar planilla y devolver turnos a estado 'no pagado'"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Botón Marcar como Pagada (solo si no está pagada) */}
                          {!isPagada && (
                            <Button
                              onClick={() => marcarComoPagada(planilla.id)}
                              size="sm"
                              variant="outline"
                              disabled={isProcesando}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Marcar planilla como pagada"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Pagada
                            </Button>
                          )}

                          {/* Botón Descargar */}
                          <Button
                            onClick={() => descargarPlanilla(planilla.id)}
                            size="sm"
                            disabled={descargando === planilla.id || isProcesando}
                            className={cn(
                              "bg-blue-600 hover:bg-blue-700",
                              isPagada && "bg-green-600 hover:bg-green-700"
                            )}
                          >
                            {descargando === planilla.id ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Descargando...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {planilla.observaciones && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md">
                          <p className="text-sm text-muted-foreground">
                            <strong>Observaciones:</strong> {planilla.observaciones}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Eliminar Planilla
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">
                    Planilla #{planillaToDelete?.id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {planillaToDelete?.cantidad_turnos} turno(s) • {formatCurrency(planillaToDelete?.monto_total || 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">¿Estás seguro de que deseas eliminar esta planilla?</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• La planilla será eliminada permanentemente</p>
                <p>• Los turnos extras volverán a estado "no pagado"</p>
                <p>• Podrás generar una nueva planilla con esos turnos</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={cerrarModalEliminar}
              disabled={procesandoAccion === planillaToDelete?.id}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={eliminarPlanilla}
              disabled={procesandoAccion === planillaToDelete?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              {procesandoAccion === planillaToDelete?.id ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Planilla
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
