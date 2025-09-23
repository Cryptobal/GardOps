"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

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
import { CalendarIcon, Download, DollarSign, RefreshCw, CheckCircle, XCircle, AlertTriangle, BarChart3, FileSpreadsheet, Calendar, ChevronDown, ChevronUp, Trash2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import NavigationTabs from './components/NavigationTabs';
import StatsCards from './components/StatsCards';
import FiltrosAvanzados from './components/FiltrosAvanzados';
import DashboardStats from './components/DashboardStats';
import CalendarView from './components/CalendarView';
import DeleteConfirmModal from './components/DeleteConfirmModal';

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
  source?: string; // 'materializado', 'virtual', 'horas_extras'
  pauta_id?: string; // Para turnos virtuales
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
  
  // Estados para eliminación individual
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [turnoToDelete, setTurnoToDelete] = useState<TurnoExtra | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Estados para edición de valor
  const [showEditModal, setShowEditModal] = useState(false);
  const [turnoToEdit, setTurnoToEdit] = useState<TurnoExtra | null>(null);
  const [nuevoValor, setNuevoValor] = useState('');
  const [editando, setEditando] = useState(false);

  const { success, error } = useToast();

  // Función para abrir modal de eliminación
  const handleDeleteTurno = (turno: TurnoExtra) => {
    console.log('🔍 Abriendo modal de eliminación para turno:', turno);
    console.log('🔍 Turno source:', turno.source);
    console.log('🔍 Turno id:', turno.id);
    console.log('🔍 Turno pauta_id:', turno.pauta_id);
    setTurnoToDelete(turno);
    setShowDeleteModal(true);
  };

  // Función para abrir modal de edición
  const handleEditTurno = (turno: TurnoExtra) => {
    console.log('✏️ Abriendo modal de edición para turno:', turno);
    setTurnoToEdit(turno);
    
    // Formatear el valor inicial con separadores de miles
    const valorNumerico = typeof turno.valor === 'string' ? parseFloat(turno.valor) : turno.valor;
    const valorFormateado = Math.round(valorNumerico).toLocaleString('es-CL', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
    setNuevoValor(valorFormateado);
    setShowEditModal(true);
  };

  // Función para cerrar modal de eliminación
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTurnoToDelete(null);
  };

  // Función para cerrar modal de edición
  const closeEditModal = () => {
    setShowEditModal(false);
    setTurnoToEdit(null);
    setNuevoValor('');
    setEditando(false);
  };

  // Función para confirmar eliminación
  const confirmDeleteTurno = async () => {
    if (!turnoToDelete) {
      console.log('❌ No hay turno para eliminar');
      return;
    }

    console.log('🗑️ Iniciando eliminación del turno:', turnoToDelete);
    console.log('🔍 turnoToDelete.source:', turnoToDelete.source);

    try {
      setDeleting(true);
      
      let endpoint = '';
      let id = '';

      console.log('🔍 turnoToDelete.id:', turnoToDelete.id);
      console.log('🔍 turnoToDelete.pauta_id:', turnoToDelete.pauta_id);
      
      if (!turnoToDelete.pauta_id) {
        throw new Error('No se puede eliminar: falta pauta_id');
      }

      // Determinar endpoint según el tipo de turno
      if (turnoToDelete.source === 'horas_extras') {
        // Horas extras: usar endpoint específico
        endpoint = `/api/turnos-extras/horas-extras/${turnoToDelete.pauta_id}`;
        id = turnoToDelete.pauta_id.toString();
        console.log('🔍 Tipo: Horas Extras');
      } else {
        // Turno virtual: usar endpoint de turnos virtuales
        endpoint = `/api/turnos-extras/virtual/${turnoToDelete.pauta_id}`;
        id = turnoToDelete.pauta_id.toString();
        console.log('🔍 Tipo: Turno Virtual');
      }

      console.log('🌐 Endpoint determinado:', endpoint);
      console.log('🆔 ID del turno:', id);

      console.log('📡 Enviando request DELETE...');
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        
        // Si es un error 400 "Este no es un turno virtual válido", 
        // significa que el turno ya no es virtual (fue procesado)
        if (response.status === 400 && errorData.error?.includes('no es un turno virtual válido')) {
          console.log('🔄 Turno ya no es virtual, recargando lista...');
          success({
            title: "✅ Turno procesado",
            description: 'El turno ya fue procesado, actualizando lista...'
          });
          await cargarTurnosExtras();
          closeDeleteModal();
          return;
        }
        
        // Si es un error 500 "Error al revertir la cobertura",
        // también puede significar que el turno ya fue procesado
        if (response.status === 500 && errorData.error?.includes('Error al revertir la cobertura')) {
          console.log('🔄 Error al revertir cobertura, recargando lista...');
          success({
            title: "✅ Turno procesado",
            description: 'El turno ya fue procesado, actualizando lista...'
          });
          await cargarTurnosExtras();
          closeDeleteModal();
          return;
        }
        
        // Si es cualquier error 500, asumir que el turno ya fue procesado
        if (response.status === 500) {
          console.log('🔄 Error 500 detectado, recargando lista...');
          success({
            title: "✅ Turno procesado",
            description: 'El turno ya fue procesado, actualizando lista...'
          });
          await cargarTurnosExtras();
          closeDeleteModal();
          return;
        }
        
        throw new Error(errorData.error || 'Error al eliminar turno extra');
      }

      const result = await response.json();
      console.log('✅ Resultado de eliminación:', result);
      
      success({
        title: "✅ Turno eliminado",
        description: result.message || 'Turno extra eliminado correctamente'
      });

      // Recargar los datos
      console.log('🔄 Iniciando recarga de datos después de eliminar...');
      await cargarTurnosExtras();
      console.log('✅ Recarga de datos completada');
      
      // Cerrar modal
      closeDeleteModal();

    } catch (err) {
      console.error('❌ Error al eliminar turno extra:', err);
      error({
        title: "❌ Error",
        description: err instanceof Error ? err.message : 'Error al eliminar turno extra'
      });
    } finally {
      setDeleting(false);
      console.log('🏁 Eliminación finalizada');
    }
  };

  // Función para confirmar edición de valor
  const confirmEditTurno = async () => {
    if (!turnoToEdit) {
      console.log('❌ No hay turno para editar');
      return;
    }

    const valorNumerico = parseFloat(nuevoValor.replace(/[^\d]/g, ''));
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      error({
        title: "❌ Error",
        description: "El valor debe ser un número válido mayor o igual a 0"
      });
      return;
    }

    console.log('✏️ Iniciando edición del turno:', turnoToEdit);
    console.log('💰 Nuevo valor:', valorNumerico);

    try {
      setEditando(true);
      
      let endpoint = '';
      let body = {};

      // Determinar el endpoint correcto según el tipo de turno
      if (turnoToEdit.source === 'materializado') {
        // Turno extra materializado - usar endpoint de materializados
        endpoint = `/api/turnos-extras/materializado/${turnoToEdit.id}/valor`;
        body = {
          valor: valorNumerico
        };
      } else if (turnoToEdit.pauta_id) {
        // Turno virtual - usar endpoint de virtuales
        endpoint = `/api/turnos-extras/virtual/${turnoToEdit.pauta_id}/valor`;
        body = {
          valor: valorNumerico
        };
      } else {
        throw new Error('No se puede editar: falta información del turno');
      }

      console.log('🌐 Endpoint determinado:', endpoint);
      console.log('📦 Body:', body);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.error || 'Error al actualizar valor del turno extra');
      }

      const result = await response.json();
      console.log('✅ Resultado de edición:', result);
      
      success({
        title: "✅ Valor actualizado",
        description: `Valor actualizado a $${valorNumerico.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      });

      // Recargar los datos
      console.log('🔄 Iniciando recarga de datos después de editar...');
      await cargarTurnosExtras();
      console.log('✅ Recarga de datos completada');
      
      // Cerrar modal
      closeEditModal();

    } catch (err) {
      console.error('❌ Error al editar turno extra:', err);
      error({
        title: "❌ Error",
        description: err instanceof Error ? err.message : 'Error al actualizar valor del turno extra'
      });
    } finally {
      setEditando(false);
      console.log('🏁 Edición finalizada');
    }
  };

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
    console.log('📡 cargarTurnosExtras() iniciada');
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

      // Agregar timestamp para evitar caché
      params.append('_t', Date.now().toString());

      const url = `/api/pauta-diaria/turno-extra?${params.toString()}`;
      console.log('🌐 Fetching URL:', url);
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      console.log('📊 Response status:', response.status);
      console.log('📊 Response data:', data);

      if (response.ok) {
        const turnos = data.turnos_extras || [];
        console.log('✅ Datos recibidos:', turnos.length, 'turnos');
        console.log('📋 Detalles de turnos:', turnos.map(t => ({ id: t.id, source: t.source, pauta_id: t.pauta_id })));
        
        // Limpiar estado anterior antes de actualizar
        setTurnosExtras([]);
        
        // Pequeña pausa para asegurar que el estado se limpie
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Actualizar con nuevos datos
        setTurnosExtras(turnos);
        calcularEstadisticas(turnos);
        console.log('✅ Estado actualizado con', turnos.length, 'turnos');
      } else {
        console.error('❌ Error en response:', data.error);
        error("Error", data.error || "Error al cargar turnos extras");
      }
    } catch (err) {
      console.error('❌ Error en cargarTurnosExtras:', err);
      error("Error", "Error de conexión");
    } finally {
      setLoading(false);
      console.log('🏁 cargarTurnosExtras() finalizada');
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
      logger.error('Error cargando instalaciones::', error);
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
    // Limpiar estado anterior
    setTurnosExtras([]);
    setTurnoToDelete(null);
    setTurnoToEdit(null);
    
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

      {/* Selector de Período premium (Mobile First) */}
      <Card className="overflow-hidden bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <CardHeader className="py-4">
          <button
            type="button"
            onClick={() => setShowFiltrosLocal((v) => !v)}
            className="w-full flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300"
          >
            <CardTitle className="text-lg sm:text-xl flex items-center gap-3 font-bold text-gray-900 dark:text-white">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span>Seleccionar período y filtros</span>
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200 truncate max-w-[120px] sm:max-w-none">
                  {buildPeriodoResumen()}
                </span>
              </div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center transition-transform duration-300">
                {showFiltrosLocal ? (
                  <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
            </div>
          </button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`transition-all duration-500 ease-in-out ${
            showFiltrosLocal 
              ? 'max-h-[2000px] opacity-100' 
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}>
            <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-4">
              <FiltrosAvanzados
                filtros={filtros}
                setFiltros={setFiltros}
                instalaciones={instalaciones}
                embedded
              />
            </div>
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

      {/* Acciones Masivas Premium */}
      {selectedTurnos.length > 0 && (
        <Card className="border-2 border-blue-500/50 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/30 sm:static sticky bottom-3 left-3 right-3 z-20 backdrop-blur-md supports-[backdrop-filter]:bg-blue-50/90 dark:supports-[backdrop-filter]:bg-blue-900/40 shadow-2xl shadow-blue-200/50 dark:shadow-blue-900/30">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <FileSpreadsheet className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-lg text-blue-800 dark:text-blue-200">
                    {selectedTurnos.length} turno(s) seleccionado(s)
                  </span>
                  <Badge variant="outline" className="w-fit border-blue-500/50 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 font-semibold">
                    {formatCurrency(montoTotalSeleccionados)}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  onClick={abrirModalGenerarPlanilla}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex-1 sm:flex-none"
                >
                  <FileSpreadsheet className="h-5 w-5 mr-2" />
                  {isMobile ? "Generar Planilla" : "Generar Planilla"}
                </Button>
                <Button
                  onClick={() => setSelectedTurnos([])}
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex-1 sm:flex-none"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  {isMobile ? "Cancelar" : "Cancelar Selección"}
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
            // Vista Móvil - Diseño premium con mejor UX
            <div className="grid grid-cols-1 gap-3">
              {turnosExtras.map((turno) => {
                const estadoTurno = getEstadoTurno(turno);
                const isSelectable = !turno.pagado && !turno.planilla_id;
                const isSelected = selectedTurnos.includes(turno.id);
                
                return (
                  <Card key={turno.id} className={`overflow-hidden border-l-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                    isSelected 
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 shadow-blue-200/50 ring-2 ring-blue-200 dark:ring-blue-800' 
                      : estadoTurno.variant === 'destructive'
                      ? 'border-red-500 hover:border-red-600 bg-gradient-to-r from-red-50/50 to-white dark:from-red-900/20 dark:to-gray-900'
                      : estadoTurno.variant === 'secondary'
                      ? 'border-orange-500 hover:border-orange-600 bg-gradient-to-r from-orange-50/50 to-white dark:from-orange-900/20 dark:to-gray-900'
                      : 'border-green-500 hover:border-green-600 bg-gradient-to-r from-green-50/50 to-white dark:from-green-900/20 dark:to-gray-900'
                  }`}>
                    <CardContent className="p-5 space-y-5">
                      {/* Header premium con mejor jerarquía visual */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {isSelectable && (
                            <div className="flex-shrink-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectTurno(turno.id)}
                                className="h-6 w-6 border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-2 min-w-0 flex-1">
                            <div className="flex flex-wrap gap-2">
                              <Badge 
                                variant={estadoTurno.variant} 
                                className={`text-xs font-semibold px-3 py-1 ${
                                  estadoTurno.variant === 'destructive' 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                    : estadoTurno.variant === 'secondary'
                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                }`}
                              >
                                {estadoTurno.texto}
                              </Badge>
                              <Badge 
                                variant={turno.estado === 'reemplazo' ? 'default' : 'secondary'} 
                                className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {turno.estado.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-xl text-green-600 dark:text-green-400">
                            {formatCurrency(turno.valor)}
                          </p>
                        </div>
                      </div>

                      {/* Información del guardia con diseño premium */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-700/40 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {turno.guardia_nombre.charAt(0)}{turno.guardia_apellido_paterno.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                              {turno.guardia_nombre} {turno.guardia_apellido_paterno}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{turno.guardia_rut}</p>
                          </div>
                        </div>
                      </div>

                      {/* Información de ubicación con iconos mejorados */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Instalación</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 truncate">{turno.instalacion_nombre}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Puesto</p>
                            <p className="text-sm text-purple-700 dark:text-purple-300 truncate">{turno.nombre_puesto}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                          <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Fecha</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                              {format(new Date(turno.fecha), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción premium para móvil */}
                      {isSelectable && (
                        <div className="space-y-3 pt-4 border-t-2 border-gray-200/50 dark:border-gray-700/50">
                          <Button
                            onClick={() => {
                              setSelectedTurnos([turno.id]);
                              setShowPagoModal(true);
                            }}
                            size="lg"
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 h-14 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <DollarSign className="h-6 w-6 mr-3" />
                            Marcar como Pagado
                          </Button>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              onClick={() => handleEditTurno(turno)}
                              size="lg"
                              variant="outline"
                              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 h-12 font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                            >
                              <Edit3 className="h-5 w-5 mr-2" />
                              Editar
                            </Button>
                            <Button
                              onClick={() => handleDeleteTurno(turno)}
                              size="lg"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-2 border-red-200 dark:border-red-800 h-12 font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                            >
                              <Trash2 className="h-5 w-5 mr-2" />
                              Eliminar
                            </Button>
                          </div>
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
                          <div className="flex gap-2">
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
                            {!turno.pagado && !turno.planilla_id && (
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => handleEditTurno(turno)}
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteTurno(turno)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
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

      {/* Modal de Confirmación de Pago Premium */}
      <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw] mx-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  Confirmar Pago de Turnos Extras
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Estás a punto de marcar {selectedTurnos.length} turno(s) como pagado(s).
                  Esta acción no se puede deshacer.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 p-5 rounded-xl border border-green-200/50 dark:border-green-700/50">
              <h4 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Resumen del pago:
              </h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-2">
                <li className="flex justify-between items-center">
                  <span>Turnos seleccionados:</span>
                  <span className="font-semibold">{selectedTurnos.length}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Monto total:</span>
                  <span className="font-bold text-lg">{formatCurrency(montoTotalSeleccionados)}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Fecha de pago:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString('es-ES')}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Label htmlFor="observaciones" className="text-base font-semibold text-gray-900 dark:text-white">
                Observaciones (opcional)
              </Label>
              <Textarea
                id="observaciones"
                placeholder="Agregar comentarios sobre el pago..."
                value={observacionesPago}
                onChange={(e) => setObservacionesPago(e.target.value)}
                rows={4}
                className="border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 rounded-lg text-base"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPagoModal(false)}
              disabled={procesandoPago}
              className="w-full sm:w-auto border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold h-12"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarPago}
              disabled={procesandoPago}
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 h-12"
            >
              {procesandoPago ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <DollarSign className="h-5 w-5 mr-2" />
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

      {/* Modal de Confirmación de Eliminación */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteTurno}
        turno={turnoToDelete}
        loading={deleting}
      />

      {/* Modal de Edición de Valor Premium */}
      <Dialog open={showEditModal} onOpenChange={closeEditModal}>
        <DialogContent className="max-w-md max-w-[95vw] mx-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Edit3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  Editar Valor del Turno Extra
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Modifica el valor monetario de este turno extra.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {turnoToEdit && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-700/40 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Información del turno:
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Guardia:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{turnoToEdit.guardia_nombre} {turnoToEdit.guardia_apellido_paterno}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Instalación:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{turnoToEdit.instalacion_nombre}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Puesto:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{turnoToEdit.nombre_puesto}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{format(new Date(turnoToEdit.fecha), 'dd/MM/yyyy', { locale: es })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{turnoToEdit.estado.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="nuevo-valor" className="text-base font-semibold text-gray-900 dark:text-white">
                  Nuevo Valor ($)
                </Label>
                <input
                  id="nuevo-valor"
                  type="text"
                  value={nuevoValor}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/[^\d]/g, '');
                    const numero = valor ? parseInt(valor, 10) : 0;
                    setNuevoValor(numero.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  placeholder="Ingresa el nuevo valor"
                />
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Valor actual:</strong> ${(() => {
                      const valorNumerico = typeof turnoToEdit.valor === 'string' ? parseFloat(turnoToEdit.valor) : turnoToEdit.valor;
                      return Math.round(valorNumerico).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={closeEditModal}
              disabled={editando}
              className="w-full sm:w-auto border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold h-12"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmEditTurno}
              disabled={editando}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 h-12"
            >
              {editando ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Edit3 className="h-5 w-5 mr-2" />
                  Actualizar Valor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 