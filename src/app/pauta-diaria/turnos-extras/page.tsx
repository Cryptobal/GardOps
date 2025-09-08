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
import { es } from 'date-fns/locale';
import { CalendarIcon, Download, DollarSign, RefreshCw, CheckCircle, XCircle, AlertTriangle, BarChart3, FileSpreadsheet, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [turnosExtras, setTurnosExtras] = useState<TurnoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'turnos' | 'dashboard' | 'historial'>('turnos');
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
  const [showFiltros, setShowFiltros] = useState(false);
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
  const [isMobile, setIsMobile] = useState(false);
  const [showFiltrosLocal, setShowFiltrosLocal] = useState(false);

  const { success, error } = useToast();

  // Detectar si es móvil automáticamente
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

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

  // Leer tab desde query (?tab=dashboard) para abrir Dashboard directamente
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'dashboard') {
      setActiveTab('dashboard');
      setShowDashboard(true);
      setShowCalendarView(false);
    }
  }, [searchParams]);

  // Construir resumen compacto del período
  const buildPeriodoResumen = () => {
    // Si hay un mes seleccionado, mostrar solo Mes Año (no duplicar con rango)
    if (filtros.mes) {
      const [y, m] = filtros.mes.split('-').map((v) => parseInt(v));
      const date = new Date(y, (m || 1) - 1, 1);
      const label = format(date, 'MMM yyyy', { locale: es });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    // Si hay rango, formatear dd/MM/yyyy → dd/MM/yyyy
    if (filtros.fechaInicio && filtros.fechaFin) {
      const fi = format(new Date(filtros.fechaInicio), 'dd/MM/yyyy');
      const ff = format(new Date(filtros.fechaFin), 'dd/MM/yyyy');
      return `${fi} → ${ff}`;
    }
    return 'Sin filtros';
  };

  // Función para manejar el cambio de pestañas
  const handleTabChange = (tab: 'turnos' | 'dashboard' | 'historial') => {
    setActiveTab(tab);
    
    if (tab === 'dashboard') {
      setShowDashboard(true);
      setShowCalendarView(false);
      const path = typeof window !== 'undefined' ? window.location.pathname : '/pauta-diaria/turnos-extras';
      router.replace(`${path}?tab=dashboard`);
    } else if (tab === 'historial') {
      router.push('/pauta-diaria/turnos-extras/historial');
    } else {
      setShowDashboard(false);
      setShowCalendarView(false);
      const path = typeof window !== 'undefined' ? window.location.pathname : '/pauta-diaria/turnos-extras';
      router.replace(path);
    }
  };

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
    <div className="p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-6">
      {/* Navigation Tabs */}
      <NavigationTabs activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            💰 Turnos Extras y Reemplazos
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gestión de pagos para PPC cubierto y reemplazos de titular
          </p>
        </div>
        <div className="hidden" />
      </div>

      {/* Selector de Período compacto (Mobile First) */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <button
            type="button"
            onClick={() => setShowFiltrosLocal((v) => !v)}
            className="w-full flex items-center justify-between gap-2"
          >
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Seleccionar período y filtros
            </CardTitle>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="truncate">{buildPeriodoResumen()}</span>
              {showFiltrosLocal ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`${showFiltrosLocal ? 'block' : 'hidden'}`}>
            <FiltrosAvanzados
              filtros={filtros}
              setFiltros={setFiltros}
              instalaciones={instalaciones}
              embedded
            />
          </div>
        </CardContent>
      </Card>

      {/* Dashboard de Estadísticas */}
      {showDashboard && (
        <DashboardStats filtros={filtros} />
      )}

      {/* Vista de Calendario (opcional, desactivada al simplificar UI) */}
      {false && showCalendarView && (
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
        <Card className="border-blue-600/50 bg-blue-900/20 dark:bg-blue-900/30 sm:static sticky bottom-2 left-0 right-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-blue-900/30">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  {!isMobile && "Generar Planilla"}
                </Button>
                <Button
                  onClick={() => setSelectedTurnos([])}
                  variant="outline"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {!isMobile && "Cancelar Selección"}
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
          ) : isMobile ? (
            // Vista Móvil - Contenedores responsivos
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {turnosExtras.map((turno) => {
                const estadoTurno = getEstadoTurno(turno);
                const isSelectable = !turno.pagado && !turno.planilla_id;
                const isSelected = selectedTurnos.includes(turno.id);
                
                return (
                  <Card key={turno.id} className={`overflow-hidden border-l-4 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : estadoTurno.variant === 'destructive'
                      ? 'border-red-500'
                      : estadoTurno.variant === 'secondary'
                      ? 'border-orange-500'
                      : 'border-green-500'
                  }`}>
                    <CardContent className="p-4">
                      {/* Header con checkbox y estado */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelectable && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectTurno(turno.id)}
                            />
                          )}
                          <Badge variant={estadoTurno.variant} className="text-xs">
                            {estadoTurno.texto}
                          </Badge>
                        </div>
                        <Badge variant={turno.estado === 'reemplazo' ? 'default' : 'secondary'} className="text-xs">
                          {turno.estado.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Información del guardia */}
                      <div className="mb-3">
                        <h4 className="font-semibold text-sm truncate">
                          {turno.guardia_nombre} {turno.guardia_apellido_paterno}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{turno.guardia_rut}</p>
                      </div>

                      {/* Información de la instalación y puesto */}
                      <div className="mb-3 space-y-1 min-w-0">
                        <p className="text-sm font-medium truncate">{turno.instalacion_nombre}</p>
                        <p className="text-xs text-muted-foreground truncate">{turno.nombre_puesto}</p>
                      </div>

                      {/* Fecha y valor */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(turno.fecha), 'dd/MM/yyyy')}
                        </p>
                        <p className="font-bold text-sm">{formatCurrency(turno.valor)}</p>
                      </div>

                      {/* Botón de acción */}
                      {isSelectable && (
                        <div className="mt-3 pt-3 border-t">
                          <Button
                            onClick={() => {
                              setSelectedTurnos([turno.id]);
                              setShowPagoModal(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Marcar como Pagado
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Vista Desktop - Tabla tradicional
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <Checkbox
                        checked={selectedTurnos.length === turnosExtras.filter(t => !t.pagado && !t.planilla_id).length && turnosExtras.filter(t => !t.pagado && !t.planilla_id).length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left p-2 whitespace-nowrap">Guardia</th>
                    <th className="text-left p-2 whitespace-nowrap">Instalación</th>
                    <th className="text-left p-2 whitespace-nowrap">Puesto</th>
                    <th className="text-left p-2 whitespace-nowrap">Fecha</th>
                    <th className="text-left p-2 whitespace-nowrap">Tipo</th>
                    <th className="text-left p-2 whitespace-nowrap">Valor</th>
                    <th className="text-left p-2 whitespace-nowrap">Estado</th>
                    <th className="text-left p-2 whitespace-nowrap">Acciones</th>
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
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {turno.guardia_nombre} {turno.guardia_apellido_paterno}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {turno.guardia_rut}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 truncate">{turno.instalacion_nombre}</td>
                        <td className="p-2 truncate">{turno.nombre_puesto}</td>
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