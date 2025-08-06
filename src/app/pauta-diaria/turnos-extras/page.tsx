'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Download, DollarSign, RefreshCw, CheckCircle, XCircle, AlertTriangle, BarChart3, FileSpreadsheet, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import NavigationTabs from './components/NavigationTabs';
import StatsCards from './components/StatsCards';
import FiltrosAvanzados from './components/FiltrosAvanzados';
import DashboardStats from './components/DashboardStats';
import CalendarView from './components/CalendarView';

interface TurnoExtra {
  id: string;
  guardia_id: string;
  guardia_nombre: string;
  guardia_apellido_paterno: string;
  guardia_apellido_materno: string;
  guardia_rut: string;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_id: string;
  nombre_puesto: string;
  fecha: string;
  estado: 'reemplazo' | 'ppc';
  valor: number | string;
  pagado: boolean;
  fecha_pago: string | null;
  observaciones_pago: string | null;
  usuario_pago: string | null;
  planilla_id: number | null;
  created_at: string;
}

// Función para formatear números con puntos como separadores de miles sin decimales
const formatCurrency = (amount: number | string): string => {
  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

// Función para obtener el mes actual en formato YYYY-MM
const getMesActual = () => {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${año}-${mes}`;
};

// Función para obtener las fechas de inicio y fin del mes
const getFechasMes = (mesString: string) => {
  const [año, mes] = mesString.split('-');
  const fechaInicio = `${año}-${mes}-01`;
  const fechaFin = new Date(parseInt(año), parseInt(mes), 0).toISOString().split('T')[0];
  return { fechaInicio, fechaFin };
};

export default function TurnosExtrasPage() {
  const [turnosExtras, setTurnosExtras] = useState<TurnoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: 'all',
    pagado: 'all',
    instalacion: 'all',
    busqueda: '',
    mes: getMesActual(), // Por defecto, mes actual
    montoMin: '',
    montoMax: '',
    rangoFecha: ''
  });
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    noPagados: 0,
    pendientes: 0,
    pagados: 0,
    montoTotal: 0,
    montoNoPagado: 0,
    montoPendiente: 0,
    montoPagado: 0,
    promedioPorTurno: 0,
    turnosEsteMes: 0,
    montoEsteMes: 0
  });
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [observacionesPago, setObservacionesPago] = useState('');
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [showFiltros, setShowFiltros] = useState(true);
  const [instalaciones, setInstalaciones] = useState<Array<{ id: string; nombre: string }>>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [procesandoPlanilla, setProcesandoPlanilla] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [showPlanillaSuccessModal, setShowPlanillaSuccessModal] = useState(false);
  const [planillaGenerada, setPlanillaGenerada] = useState<{
    id: number;
    cantidadTurnos: number;
    montoTotal: number | string;
  } | null>(null);

  const { success, error } = useToast();

  // Inicializar filtros con el mes actual
  useEffect(() => {
    const mesActual = getMesActual();
    const { fechaInicio, fechaFin } = getFechasMes(mesActual);
    
    setFiltros(prev => ({
      ...prev,
      mes: mesActual,
      fechaInicio,
      fechaFin
    }));
  }, []);

  // Cargar turnos extras
  const cargarTurnosExtras = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.estado !== 'all') params.append('estado', filtros.estado);
      if (filtros.pagado !== 'all') params.append('pagado', filtros.pagado);
      if (filtros.instalacion !== 'all') params.append('instalacion_id', filtros.instalacion);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros.montoMin) params.append('monto_min', filtros.montoMin);
      if (filtros.montoMax) params.append('monto_max', filtros.montoMax);
      if (filtros.rangoFecha) params.append('rango_fecha', filtros.rangoFecha);

      const response = await fetch(`/api/pauta-diaria/turno-extra?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setTurnosExtras(data.turnos_extras || []);
        calcularEstadisticas(data.turnos_extras || []);
      } else {
        error("Error", data.error || "Error al cargar turnos extras");
      }
    } catch (err) {
      console.error('Error:', err);
      error("Error", "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const calcularEstadisticas = (turnos: TurnoExtra[]) => {
    const total = turnos.length;
    const noPagados = turnos.filter(t => !t.pagado && !t.planilla_id).length;
    const pendientes = turnos.filter(t => !t.pagado && t.planilla_id).length;
    const pagados = turnos.filter(t => t.pagado).length;
    const montoTotal = turnos.reduce((sum, t) => sum + Number(t.valor), 0);
    const montoNoPagado = turnos.filter(t => !t.pagado && !t.planilla_id).reduce((sum, t) => sum + Number(t.valor), 0);
    const montoPendiente = turnos.filter(t => !t.pagado && t.planilla_id).reduce((sum, t) => sum + Number(t.valor), 0);
    const montoPagado = turnos.filter(t => t.pagado).reduce((sum, t) => sum + Number(t.valor), 0);
    const promedioPorTurno = total > 0 ? montoTotal / total : 0;

    // Calcular estadísticas del mes seleccionado
    const mesSeleccionado = filtros.mes || getMesActual();
    const { fechaInicio, fechaFin } = getFechasMes(mesSeleccionado);
    
    const turnosEsteMes = turnos.filter(t => {
      const fecha = new Date(t.fecha);
      const fechaTurno = fecha.toISOString().split('T')[0];
      return fechaTurno >= fechaInicio && fechaTurno <= fechaFin;
    }).length;
    
    const montoEsteMes = turnos.filter(t => {
      const fecha = new Date(t.fecha);
      const fechaTurno = fecha.toISOString().split('T')[0];
      return fechaTurno >= fechaInicio && fechaTurno <= fechaFin;
    }).reduce((sum, t) => sum + Number(t.valor), 0);

    setEstadisticas({
      total,
      noPagados,
      pendientes,
      pagados,
      montoTotal,
      montoNoPagado,
      montoPendiente,
      montoPagado,
      promedioPorTurno,
      turnosEsteMes,
      montoEsteMes
    });
  };

  // Marcar como pagado
  const marcarComoPagado = async (turnoIds: string[], observaciones?: string) => {
    setProcesandoPago(true);
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra/marcar-pagado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turno_ids: turnoIds,
          observaciones: observaciones || ''
        }),
      });

      const data = await response.json();

      if (response.ok) {
        success("✅ Pago procesado", data.mensaje || `${turnoIds.length} turno(s) marcado(s) como pagado(s)`);
        setSelectedTurnos([]);
        setShowPagoModal(false);
        setObservacionesPago('');
        cargarTurnosExtras();
      } else {
        error("❌ Error", data.error || "Error al marcar como pagado");
      }
    } catch (err) {
      console.error('Error:', err);
      error("❌ Error", "Error de conexión");
    } finally {
      setProcesandoPago(false);
    }
  };

  // Generar planilla
  const generarPlanilla = async () => {
    if (selectedTurnos.length === 0) {
      error("⚠️ Selección requerida", "Debes seleccionar al menos un turno para generar la planilla");
      return;
    }

    setProcesandoPlanilla(true);
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra/planillas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turnoIds: selectedTurnos,
          observaciones: ''
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar información de la planilla generada
        setPlanillaGenerada({
          id: data.planilla_id,
          cantidadTurnos: data.cantidad_turnos,
          montoTotal: data.monto_total
        });
        
        // Mostrar el modal de éxito
        setShowPlanillaSuccessModal(true);
        
        // Limpiar selección y recargar
        setSelectedTurnos([]);
        cargarTurnosExtras();
      } else {
        error("❌ Error", data.error || "Error al generar la planilla");
      }
    } catch (err) {
      console.error('Error:', err);
      error("❌ Error", "Error de conexión");
    } finally {
      setProcesandoPlanilla(false);
    }
  };

  // Exportar Excel
  const exportarExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.estado !== 'all') params.append('estado', filtros.estado);
      if (filtros.pagado !== 'all') params.append('pagado', filtros.pagado);
      if (filtros.instalacion !== 'all') params.append('instalacion_id', filtros.instalacion);
      if (filtros.montoMin) params.append('monto_min', filtros.montoMin);
      if (filtros.montoMax) params.append('monto_max', filtros.montoMax);
      if (filtros.rangoFecha) params.append('rango_fecha', filtros.rangoFecha);

      const response = await fetch(`/api/pauta-diaria/turno-extra/exportar?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turnos_extras_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        success("📊 Excel exportado", "Archivo descargado exitosamente");
      } else {
        error("❌ Error", "Error al exportar Excel");
      }
    } catch (err) {
      console.error('Error:', err);
      error("❌ Error", "Error de conexión");
    }
  };

  // Seleccionar/deseleccionar todos
  const toggleSelectAll = () => {
    // Obtener solo los turnos que pueden ser seleccionados (no pagados y sin planilla_id)
    const turnosSeleccionables = turnosExtras.filter(t => !t.pagado && !t.planilla_id);
    
    if (selectedTurnos.length === turnosSeleccionables.length) {
      setSelectedTurnos([]);
    } else {
      setSelectedTurnos(turnosSeleccionables.map(t => t.id));
    }
  };

  // Seleccionar turno individual
  const toggleSelectTurno = (turnoId: string) => {
    setSelectedTurnos(prev => 
      prev.includes(turnoId) 
        ? prev.filter(id => id !== turnoId)
        : [...prev, turnoId]
    );
  };

  // Abrir modal de pago
  const abrirModalPago = () => {
    if (selectedTurnos.length === 0) {
      error("⚠️ Selección requerida", "Debes seleccionar al menos un turno para pagar");
      return;
    }
    setShowPagoModal(true);
  };

  // Abrir modal de generar planilla
  const abrirModalGenerarPlanilla = () => {
    if (selectedTurnos.length === 0) {
      error("⚠️ Selección requerida", "Debes seleccionar al menos un turno para generar la planilla");
      return;
    }
    generarPlanilla();
  };

  // Confirmar pago
  const confirmarPago = () => {
    marcarComoPagado(selectedTurnos, observacionesPago);
  };

  // Cargar instalaciones para filtros
  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/instalaciones-con-turnos-extras');
      const data = await response.json();
      if (response.ok && data.success) {
        setInstalaciones(data.instalaciones || []);
      }
    } catch (error) {
      console.error('Error cargando instalaciones:', error);
    }
  };

  // Calcular monto total de turnos seleccionados
  const montoTotalSeleccionados = selectedTurnos
    .map(id => {
      const turno = turnosExtras.find(t => t.id === id);
      return turno ? (typeof turno.valor === 'string' ? parseFloat(turno.valor) : turno.valor) : 0;
    })
    .reduce((sum, valor) => sum + valor, 0);

  // Obtener estado del turno para mostrar
  const getEstadoTurno = (turno: TurnoExtra) => {
    if (turno.pagado) return { texto: 'Pagado', variant: 'default' as const };
    if (turno.planilla_id) return { texto: 'Pendiente', variant: 'secondary' as const };
    return { texto: 'No pagado', variant: 'destructive' as const };
  };

  // Función para manejar clics en los KPIs
  const handleKPIClick = (filterType: 'total' | 'noPagados' | 'pendientes' | 'pagados' | 'montoTotal') => {
    switch (filterType) {
      case 'noPagados':
        setFiltros(prev => ({ ...prev, pagado: 'false' }));
        break;
      case 'pendientes':
        // Para pendientes, mostrar los que no están pagados pero tienen planilla_id
        setFiltros(prev => ({ ...prev, pagado: 'pending' }));
        break;
      case 'pagados':
        setFiltros(prev => ({ ...prev, pagado: 'true' }));
        break;
      case 'total':
      case 'montoTotal':
        // Para total y monto total, mostrar todos (limpiar filtros de pago)
        setFiltros(prev => ({ ...prev, pagado: 'all' }));
        break;
    }
  };

  useEffect(() => {
    cargarTurnosExtras();
    cargarInstalaciones();
  }, [filtros]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Tabs */}
      <NavigationTabs />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Turnos Pago, Turnos Extras</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={cargarTurnosExtras} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button 
            onClick={() => setShowDashboard(!showDashboard)} 
            variant={showDashboard ? "default" : "outline"} 
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showDashboard ? 'Ocultar Dashboard' : 'Ver Dashboard'}
          </Button>
          <Button 
            onClick={() => setShowCalendarView(!showCalendarView)} 
            variant={showCalendarView ? "default" : "outline"} 
            size="sm"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {showCalendarView ? 'Ocultar Calendario' : 'Ver Calendario'}
          </Button>
          <Button 
            onClick={() => window.location.href = '/pauta-diaria/turnos-extras/historial'} 
            variant="outline" 
            size="sm"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
        </div>
      </div>

      {/* Dashboard de Estadísticas */}
      {showDashboard && (
        <DashboardStats filtros={filtros} />
      )}

      {/* Vista de Calendario */}
      {showCalendarView && (
        <CalendarView 
          turnosExtras={turnosExtras}
          onDayClick={(date) => {
            // Filtrar por la fecha seleccionada
            const fechaString = date.toISOString().split('T')[0];
            setFiltros(prev => ({
              ...prev,
              fechaInicio: fechaString,
              fechaFin: fechaString
            }));
          }}
        />
      )}

      {/* Estadísticas */}
      <StatsCards estadisticas={estadisticas} onCardClick={handleKPIClick} />

      {/* Filtros */}
      <FiltrosAvanzados
        filtros={filtros}
        setFiltros={setFiltros}
        showFiltros={showFiltros}
        setShowFiltros={setShowFiltros}
        instalaciones={instalaciones}
      />

      {/* Acciones Masivas */}
      {selectedTurnos.length > 0 && (
        <Card className="border-blue-600/50 bg-blue-900/20 dark:bg-blue-900/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {selectedTurnos.length} turno(s) seleccionado(s)
                </span>
                <Badge variant="outline" className="ml-2 border-blue-600/50 text-blue-600 dark:text-blue-400">
                  {formatCurrency(montoTotalSeleccionados)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={abrirModalGenerarPlanilla}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Generar Planilla
                </Button>
                <Button
                  onClick={() => setSelectedTurnos([])}
                  variant="outline"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Selección
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Turnos Extras */}
      <Card>
        <CardHeader>
          <CardTitle>Turnos Extras</CardTitle>
          <CardDescription>
            Lista de turnos extras registrados ({turnosExtras.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : turnosExtras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay turnos extras para mostrar</p>
              <p className="text-sm">Ajusta los filtros o crea nuevos turnos extras</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <Checkbox
                        checked={selectedTurnos.length === turnosExtras.filter(t => !t.pagado && !t.planilla_id).length && turnosExtras.filter(t => !t.pagado && !t.planilla_id).length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left p-2">Guardia</th>
                    <th className="text-left p-2">Instalación</th>
                    <th className="text-left p-2">Puesto</th>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Valor</th>
                    <th className="text-left p-2">Estado</th>
                    <th className="text-left p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosExtras.map((turno) => {
                    const estadoTurno = getEstadoTurno(turno);
                    return (
                      <tr key={turno.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-2">
                          {!turno.pagado && !turno.planilla_id && (
                            <Checkbox
                              checked={selectedTurnos.includes(turno.id)}
                              onCheckedChange={() => toggleSelectTurno(turno.id)}
                            />
                          )}
                        </td>
                        <td className="p-2">
                          <div>
                            <div className="font-medium">
                              {turno.guardia_nombre} {turno.guardia_apellido_paterno}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {turno.guardia_rut}
                            </div>
                          </div>
                        </td>
                        <td className="p-2">{turno.instalacion_nombre}</td>
                        <td className="p-2">{turno.nombre_puesto}</td>
                        <td className="p-2">{format(new Date(turno.fecha), 'dd/MM/yyyy')}</td>
                        <td className="p-2">
                          <Badge variant={turno.estado === 'reemplazo' ? 'default' : 'secondary'}>
                            {turno.estado.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-2 font-medium">{formatCurrency(turno.valor)}</td>
                        <td className="p-2">
                          <Badge variant={estadoTurno.variant}>
                            {estadoTurno.texto}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {!turno.pagado && !turno.planilla_id && (
                            <Button
                              onClick={() => {
                                setSelectedTurnos([turno.id]);
                                setShowPagoModal(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pagado
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmación de Pago */}
      <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pago de Turnos Extras</DialogTitle>
            <DialogDescription>
              Estás a punto de marcar {selectedTurnos.length} turno(s) como pagado(s).
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">Resumen del pago:</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Turnos seleccionados: {selectedTurnos.length}</li>
                <li>• Monto total: {formatCurrency(montoTotalSeleccionados)}</li>
                <li>• Fecha de pago: {new Date().toLocaleDateString('es-ES')}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                placeholder="Agregar comentarios sobre el pago..."
                value={observacionesPago}
                onChange={(e) => setObservacionesPago(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPagoModal(false)}
              disabled={procesandoPago}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarPago}
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

      {/* Modal de Éxito de Planilla Generada */}
      <Dialog open={showPlanillaSuccessModal} onOpenChange={setShowPlanillaSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Planilla Generada Exitosamente
            </DialogTitle>
            <DialogDescription>
              La planilla ha sido creada y está lista para descargar.
            </DialogDescription>
          </DialogHeader>
          
          {planillaGenerada && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Detalles de la planilla:</h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• <strong>ID de Planilla:</strong> #{planillaGenerada.id}</li>
                  <li>• <strong>Cantidad de turnos:</strong> {planillaGenerada.cantidadTurnos}</li>
                  <li>• <strong>Monto total:</strong> {formatCurrency(planillaGenerada.montoTotal)}</li>
                  <li>• <strong>Fecha de generación:</strong> {new Date().toLocaleDateString('es-ES')}</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Consejo:</strong> Ve al historial de planillas para descargar el archivo XLSX con el formato requerido para transferencias bancarias.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPlanillaSuccessModal(false)}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setShowPlanillaSuccessModal(false);
                window.location.href = '/pauta-diaria/turnos-extras/historial';
              }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Ir al Historial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 