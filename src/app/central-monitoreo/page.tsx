"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Phone, MessageSquare, Clock, CheckCircle, XCircle, 
  AlertTriangle, Users, Building2, RefreshCw, Download,
  Calendar, ChevronLeft, ChevronRight, AlertCircle,
  PhoneOff, PhoneCall, Loader2, Search, Filter,
  TrendingUp, TrendingDown, Activity, Target, Bell, Settings, Plus, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { rbacFetch } from '@/lib/rbacClient';
import { useChileDate } from '@/hooks/useChileDate';

// Importar componentes locales
import { KPICards } from './components/KPICards';
import { DateSelector } from './components/DateSelector';
import { LlamadoCard } from './components/LlamadoCard';
import { RegistroModal } from './components/RegistroModal';

// Interfaces
interface Llamado {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  instalacion_telefono: string;
  guardia_id: string | null;
  guardia_nombre: string | null;
  guardia_telefono: string | null;
  programado_para: string;
  ejecutado_en: string | null;
  estado: 'pendiente' | 'exitoso' | 'no_contesta' | 'ocupado' | 'incidente' | 'cancelado';
  canal: string;
  contacto_tipo: string;
  contacto_telefono: string;
  observaciones: string | null;
  rol_nombre: string | null;
  nombre_puesto: string | null;
  minutos_atraso?: number;
  // Flags calculados por backend (vista)
  es_urgente?: boolean;
  es_actual?: boolean;
  es_proximo?: boolean;
}

export default function CentralMonitoreoPage() {
  // ✅ NUEVA ARQUITECTURA: Usar fechas de Chile consistentes
  const { fechaHoy, timezone, loading: loadingConfig } = useChileDate();
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(fechaHoy);
  const [llamados, setLlamados] = useState<Llamado[]>([]);
  const [kpis, setKpis] = useState({
    total: 0,
    actuales: 0,
    proximos: 0,
    no_realizados: 0,
    urgentes: 0,
    completados: 0
  });
  const [filtroEstado, setFiltroEstado] = useState<string>('actuales');
  const [busqueda, setBusqueda] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [llamadoSeleccionado, setLlamadoSeleccionado] = useState<Llamado | null>(null);
  const [estadoRegistro, setEstadoRegistro] = useState('');
  const [observacionesRegistro, setObservacionesRegistro] = useState('');
  const [modalConfirmacion, setModalConfirmacion] = useState({
    mostrar: false,
    mensaje: '',
    programado: '',
    actual: '',
    estado: '',
    observaciones: ''
  });

  // Ref para evitar recargas innecesarias
  const fechaRef = useRef(fecha);
  fechaRef.current = fecha;

  // Función para cargar datos automáticamente (optimizada) - NUEVA ARQUITECTURA
  const cargarDatos = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      // ✅ NUEVA ARQUITECTURA: Usar timezone de configuración de sistema
      const tz = timezone || 'America/Santiago';
      const currentFecha = fechaRef.current;
      
      // ✅ NUEVO: Usar endpoint unificado que calcula KPIs y filtros en backend
      const responseFiltros = await rbacFetch(`/api/central-monitoring/filtros?fecha=${currentFecha}&filtro=${filtroEstado}&busqueda=${encodeURIComponent(busqueda)}&tz=${encodeURIComponent(tz)}`);
      
      if (responseFiltros.ok) {
        const dataFiltros = await responseFiltros.json();
        
        // ✅ Backend ya calcula KPIs y filtros - solo asignar
        setLlamados(dataFiltros.data.llamados || []);
        setKpis({
          total: dataFiltros.data.kpis.total || 0,
          actuales: dataFiltros.data.kpis.actuales || 0,
          proximos: dataFiltros.data.kpis.proximos || 0,
          no_realizados: dataFiltros.data.kpis.no_realizados || 0,
          urgentes: dataFiltros.data.kpis.urgentes || 0,
          completados: dataFiltros.data.kpis.completados || 0
        });
        
        logger.debug('✅ [CENTRAL-MONITORING] Datos cargados desde backend unificado:', {
          llamados: dataFiltros.data.llamados?.length || 0,
          kpis: dataFiltros.data.kpis
        });
      }
      
      // Notificar a otras pestañas sobre la actualización
      if (typeof window !== 'undefined') {
        localStorage.setItem('central-monitoreo-update', JSON.stringify({
          fecha: currentFecha,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      logger.error('Error cargando datos automáticos::', error);
      if (!isSilent) {
        toast.error('Error al cargar los datos automáticos');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [filtroEstado, busqueda, timezone]); // ✅ Incluir filtros y timezone como dependencias

  // ✅ NUEVA ARQUITECTURA: Actualizar fecha cuando cambie la configuración
  useEffect(() => {
    if (fechaHoy && !loadingConfig) {
      setFecha(fechaHoy);
    }
  }, [fechaHoy, loadingConfig]);

  // ✅ NUEVA ARQUITECTURA: Recargar cuando cambien fecha, filtros o búsqueda
  useEffect(() => {
    if (!loadingConfig) {
      cargarDatos();
    }
  }, [fecha, filtroEstado, busqueda, cargarDatos, loadingConfig]);

  // Auto-refresh cada 30 segundos (silencioso) - optimizado
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      cargarDatos(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, cargarDatos]);

  // Escuchar cambios en otras pestañas - optimizado
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'central-monitoreo-update' && e.newValue) {
        try {
          const updateData = JSON.parse(e.newValue);
          if (updateData.fecha === fechaRef.current) {
            logger.debug('🔄 Actualización detectada desde otra pestaña - Recargando KPIs');
            cargarDatos(true);
          }
        } catch (error) {
          logger.error('Error parsing storage update::', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [cargarDatos]);



  // ✅ NUEVA ARQUITECTURA: Backend ya filtra los datos, frontend solo muestra
  const llamadosFiltrados = useMemo(() => {
    // Backend ya aplica filtros, solo retornar los datos recibidos
    return llamados;
  }, [llamados]);

  // Handlers
  const handleWhatsApp = (telefono: string, mensaje: string) => {
    const url = `https://wa.me/${telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const handleRegistrar = (llamado: Llamado) => {
    setLlamadoSeleccionado(llamado);
    setModalRegistro(true);
  };

  const handleGuardarRegistro = async (estado: string, observaciones: string, forzarRegistro = false) => {
    if (!llamadoSeleccionado) return;
    
    try {
      const response = await rbacFetch(`/api/central-monitoring/llamado/${llamadoSeleccionado.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado,
          observaciones,
          canal: 'telefono',
          forzarRegistro
        })
      });
      
      if (response.ok) {
        toast.success('Llamado registrado exitosamente');
        cargarDatos();
      } else {
        const errorData = await response.json();
        
        // Si requiere confirmación, mostrar modal
        if (errorData.requiereConfirmacion) {
          setModalConfirmacion({
            mostrar: true,
            mensaje: errorData.error,
            programado: errorData.programado,
            actual: errorData.actual,
            estado,
            observaciones
          });
        } else {
          toast.error(errorData.error || 'Error al registrar el llamado');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al registrar el llamado');
    }
  };

  // Handler para confirmar registro fuera de rango
  const handleConfirmarRegistro = async () => {
    if (modalConfirmacion.estado && modalConfirmacion.observaciones) {
      await handleGuardarRegistro(modalConfirmacion.estado, modalConfirmacion.observaciones, true);
      setModalConfirmacion({ mostrar: false, mensaje: '', programado: '', actual: '', estado: '', observaciones: '' });
    }
  };

  // Handler para cancelar registro fuera de rango
  const handleCancelarRegistro = () => {
    setModalConfirmacion({ mostrar: false, mensaje: '', programado: '', actual: '', estado: '', observaciones: '' });
  };

  // Handler para filtrar por KPI
  const handleKPIClick = (tipo: string) => {
    setFiltroEstado(tipo);
  };

  const handleObservacionesUpdate = async (llamadoId: string, observaciones: string) => {
    try {
      const response = await rbacFetch(`/api/central-monitoring/llamado/${llamadoId}/observaciones`, {
        method: 'PATCH',
        body: JSON.stringify({
          observaciones
        })
      });
      
      if (response.ok) {
        toast.success('Observaciones actualizadas exitosamente');
        cargarDatos();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al actualizar observaciones');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar observaciones');
    }
  };

  // Función para generar agenda (ELIMINADA - ahora es automática)
  // Los datos se calculan automáticamente desde la pauta mensual

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto p-2 space-y-2">
      {/* Header Mobile First Minimalista */}
      <div className="flex items-center justify-between py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              📞 Central de Monitoreo
            </h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-blue-500 hover:text-blue-600 cursor-help flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="text-sm">
                    <p className="font-semibold mb-2">🕐 Lógica de Turnos</p>
                    <p className="mb-1">Cada día muestra un turno de 24 horas:</p>
                    <p className="mb-1">• <strong>12:00 PM - 11:59 PM</strong> del día actual</p>
                    <p>• <strong>12:00 AM - 11:59 AM</strong> del día siguiente</p>
                    <p className="mt-2 text-xs text-gray-400">
                      Ejemplo: 16/09 muestra llamados del 16/09 12:00 PM al 17/09 11:59 AM
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
            Monitoreo de guardias en tiempo real
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Phone className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Selector de fecha - Mobile First Optimizado */}
      <div className="mb-4">
        <DateSelector
          fecha={fecha}
          onFechaChange={setFecha}
          onRefresh={cargarDatos}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={() => setAutoRefresh(!autoRefresh)}
        />
      </div>

      {/* KPIs - Mobile First Optimizado */}
      <div className="mb-4">
        <KPICards 
          {...kpis} 
          filtroActivo={filtroEstado}
          onKPIClick={handleKPIClick}
        />
      </div>

      {/* Búsqueda - Mobile First Optimizado */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por instalación o guardia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 h-10 text-sm border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
          />
        </div>
      </div>

      {/* Lista de llamados - Mobile First Optimizado */}
      <div className="space-y-3">
        {llamadosFiltrados.length === 0 ? (
          <Card className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No hay llamados en esta categoría</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {llamadosFiltrados.map(llamado => (
              <LlamadoCard
                key={llamado.id}
                llamado={llamado}
                onRegistrar={handleRegistrar}
                onWhatsApp={handleWhatsApp}
                onObservacionesUpdate={handleObservacionesUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de registro */}
      <RegistroModal
        isOpen={modalRegistro}
        onClose={() => setModalRegistro(false)}
        llamado={llamadoSeleccionado}
        onRegistrar={handleGuardarRegistro}
      />

      {/* Modal de confirmación para llamadas fuera de rango */}
      <Dialog open={modalConfirmacion.mostrar} onOpenChange={handleCancelarRegistro}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Registro
            </DialogTitle>
            <DialogDescription>
              Esta llamada está fuera del rango de tiempo normal (24 horas)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                {modalConfirmacion.mensaje}
              </p>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Programado:</span>
                <span className="font-medium">
                  {modalConfirmacion.programado ? new Date(modalConfirmacion.programado).toLocaleString('es-CL') : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Actual:</span>
                <span className="font-medium">
                  {modalConfirmacion.actual ? new Date(modalConfirmacion.actual).toLocaleString('es-CL') : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Estado:</span>
                <span className="font-medium capitalize">{modalConfirmacion.estado}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelarRegistro}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarRegistro} className="bg-amber-600 hover:bg-amber-700">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Confirmar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}