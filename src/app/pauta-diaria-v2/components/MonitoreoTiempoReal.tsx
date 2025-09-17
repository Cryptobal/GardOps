"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Grid, 
  List, 
  Phone,
  MessageSquare,
  Clock,
  Users,
  Building2,
  Activity,
  ChevronDown,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { toYmd, toDisplay } from '@/lib/date';
import { useChileDate } from '@/hooks/useChileDate';

// Helper para agregar días a una fecha
const addDays = (d: string, delta: number) => {
  const t = new Date(d + 'T00:00:00'); 
  t.setDate(t.getDate() + delta);
  return t.toISOString().slice(0,10);
};

interface Turno {
  pauta_id: string;
  instalacion_nombre: string;
  guardia_nombre: string;
  guardia_telefono: string | null;
  instalacion_telefono: string | null;
  puesto_nombre: string;
  rol_nombre: string;
  hora_inicio: string;
  hora_termino: string;
  tipo_turno: 'dia' | 'noche';
  estado_semaforo: string;
  observaciones_semaforo: string | null;
  ultima_actualizacion: string | null;
  estado_pauta_ui: string;
}

interface KPIData {
  total_turnos: number;
  pendiente: number;
  en_camino: number;
  llego: number;
  no_contesta: number;
  no_ira: number;
  retrasado: number;
  puestos_cubiertos: number;
  puestos_sin_cobertura: number;
  puestos_ppc: number;
  turnos_dia: number;
  turnos_noche: number;
}

interface MonitoreoData {
  fecha: string;
  kpis: KPIData;
  instalaciones: Array<{
    instalacion_id: string;
    instalacion_nombre: string;
    instalacion_telefono: string | null;
    turnos: Turno[];
  }>;
  turnos: Turno[];
}

interface MonitoreoTiempoRealProps {
  fecha: string;
  activeTab?: string;
}

export function MonitoreoTiempoReal({ fecha, activeTab = 'monitoreo' }: MonitoreoTiempoRealProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { fechaHoy } = useChileDate();
  const [data, setData] = useState<MonitoreoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false); // Desactivado por defecto
  const [vistaTurnos, setVistaTurnos] = useState<'instalaciones' | 'todos' | 'dia_noche'>('dia_noche');
  const [modoVista, setModoVista] = useState<'lista' | 'grid'>('grid'); // Grid por defecto
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [incluirLibres, setIncluirLibres] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 🔍 DEBUG: Log de renderizado
  devLogger.process(' [MonitoreoTiempoReal] RENDERIZANDO:', {
    fecha,
    activeTab,
    isMounted,
    loading,
    error,
    dataLength: data?.turnos?.length || 0
  });

  // Funciones de navegación de fecha
  const go = useCallback((delta: number) => {
    devLogger.process(' [MonitoreoTiempoReal.go] NAVEGANDO:', {
      delta,
      fecha,
      activeTab,
      incluirLibres
    });
    const params = new URLSearchParams();
    if (incluirLibres) params.set('incluirLibres', 'true');
    
    // ✅ NAVEGAR A LA NUEVA PÁGINA SEPARADA
    const newUrl = `/control-asistencias?fecha=${addDays(fecha, delta)}${params.toString() ? '&' + params.toString() : ''}`;
    devLogger.process(' [MonitoreoTiempoReal.go] NAVEGANDO A URL:', newUrl);
    router.push(newUrl);
  }, [fecha, incluirLibres, router]);

  const goToDate = useCallback((newFecha: string) => {
    devLogger.process(' [MonitoreoTiempoReal.goToDate] NAVEGANDO:', {
      newFecha,
      activeTab,
      incluirLibres
    });
    const params = new URLSearchParams();
    if (incluirLibres) params.set('incluirLibres', 'true');
    
    // ✅ NAVEGAR A LA NUEVA PÁGINA SEPARADA
    const newUrl = `/control-asistencias?fecha=${newFecha}${params.toString() ? '&' + params.toString() : ''}`;
    devLogger.process(' [MonitoreoTiempoReal.goToDate] NAVEGANDO A URL:', newUrl);
    router.push(newUrl);
  }, [incluirLibres, router]);

  // Evitar error de hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!isMounted) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        fecha,
        ...(incluirLibres && { incluirLibres: 'true' })
      });

      logger.debug('🔍 Cargando datos de control de asistencias...');
      const response = await fetch(`/api/pauta-diaria-v2/monitoreo-tiempo-real?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      logger.debug('📊 Datos recibidos:', result);
      
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [fecha, incluirLibres, isMounted]);

  // Auto-refresh con intervalo más frecuente para tiempo real
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(cargarDatos, 10000); // 10 segundos para tiempo real
    return () => clearInterval(interval);
  }, [autoRefresh, cargarDatos]);

  // Cargar datos iniciales y cuando cambie la fecha
  useEffect(() => {
    devLogger.search(' [MonitoreoTiempoReal useEffect] EJECUTANDO con dependencias:', {
      fecha,
      incluirLibres,
      isMounted
    });
    if (isMounted) {
      cargarDatos();
    }
  }, [fecha, incluirLibres, isMounted]);

  // Escuchar cambios en otras pestañas usando localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pauta-diaria-update' && e.newValue) {
        const updateData = JSON.parse(e.newValue);
        if (updateData.fecha === fecha) {
          logger.debug('🔄 Actualización detectada desde otra pestaña');
          cargarDatos();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fecha, cargarDatos]);

  // Datos filtrados según la vista seleccionada
  const turnosFiltrados = useMemo(() => {
    return data?.turnos || [];
  }, [data]);

  const instalacionesFiltradas = useMemo(() => {
    return data?.instalaciones || [];
  }, [data]);

  // Agrupar turnos por día y noche
  const turnosPorDiaNoche = useMemo(() => {
    if (!data?.turnos) return { dia: [], noche: [] };
    
    const turnosDia = data.turnos.filter(turno => turno.tipo_turno === 'dia');
    const turnosNoche = data.turnos.filter(turno => turno.tipo_turno === 'noche');
    
    return {
      dia: turnosDia,
      noche: turnosNoche
    };
  }, [data]);

  const handleEstadoChange = async (pautaId: string, estado: string) => {
    try {
      logger.debug('Actualizando estado:', { pautaId, estado });
      
      // Llamada a la API para actualizar el estado en la base de datos
      const response = await fetch('/api/pauta-diaria-v2/actualizar-estado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pauta_id: pautaId,
          estado_semaforo: estado,
          fecha: fecha
        }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Estado actualizado correctamente');
        
        // La notificación SSE se maneja automáticamente en el endpoint
        logger.debug('✅ Estado actualizado, notificación SSE enviada automáticamente');
        
        // Recargar datos para mostrar el cambio
        await cargarDatos();
      } else {
        throw new Error(result.error || 'Error al actualizar estado');
      }
    } catch (error) {
      logger.error('Error actualizando estado::', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleWhatsApp = (telefono: string, guardia: string) => {
    const mensaje = encodeURIComponent(`Hola ${guardia}, ¿cómo va tu turno?`);
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
  };

  const handleTelefono = (telefono: string) => {
    window.open(`tel:${telefono}`, '_blank');
  };

  const handleObservaciones = async (pautaId: string, observaciones: string) => {
    try {
      // Aquí iría la lógica para actualizar observaciones en la base de datos
      logger.debug('Actualizando observaciones:', { pautaId, observaciones });
      toast.success('Observaciones actualizadas');
      
      // Recargar datos
      await cargarDatos();
    } catch (error) {
      logger.error('Error actualizando observaciones::', error);
      toast.error('Error al actualizar observaciones');
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <Activity className="h-8 w-8 mx-auto mb-2" />
          <p className="text-base font-semibold">Error al cargar datos</p>
          <p className="text-xs">{error}</p>
        </div>
        <Button onClick={cargarDatos} variant="outline" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" />
          Reintentar
        </Button>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con controles - Mobile First Optimizado */}
      <div className="space-y-3">
        {/* Navegación de fechas compacta */}
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => go(-1)} 
            className="h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              type="date"
              className="w-auto text-sm font-medium border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400"
              value={fecha}
              onChange={(e) => goToDate(e.target.value)}
            />
            <Button
              aria-label="Abrir calendario"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.showPicker?.()}
              className="h-9 px-3 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => go(1)} 
            className="h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Controles principales en grid compacto */}
        <div className="grid grid-cols-2 gap-2">
          {/* Auto-refresh y actualización */}
          <div className="flex gap-1">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className="h-8 px-2 flex-1 text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto
            </Button>
            <Button
              onClick={cargarDatos}
              variant="outline"
              size="sm"
              className="h-8 px-2 flex-1 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Actualizar
            </Button>
          </div>

          {/* Modo vista y ver libres */}
          <div className="flex gap-1">
            <Button
              onClick={() => setModoVista('lista')}
              variant={modoVista === 'lista' ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0"
              title="Vista Lista"
            >
              <List className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => setModoVista('grid')}
              variant={modoVista === 'grid' ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0"
              title="Vista Grid"
            >
              <Grid className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => setIncluirLibres(!incluirLibres)}
              variant={incluirLibres ? "default" : "outline"}
              size="sm"
              className="h-8 px-2 flex-1 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              Libres
            </Button>
          </div>
        </div>

        {/* KPI Total destacado */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Turnos:</span>
            <span className="text-lg font-bold text-blue-800 dark:text-blue-200">{data?.kpis.total_turnos || 0}</span>
          </div>
        </div>
      </div>

      {/* KPIs Mobile First - Diseño compacto y minimalista */}
      <div className="space-y-3">
        {/* KPIs principales en grid compacto */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center shadow-md">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pendiente</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.kpis.pendiente}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">En Camino</p>
                <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100">{data.kpis.en_camino}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-300">Llegó</p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">{data.kpis.llego}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-700 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">No Contesta</p>
                <p className="text-lg font-bold text-red-900 dark:text-red-100">{data.kpis.no_contesta}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/30 border-red-300 dark:border-red-600 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center shadow-md">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">No Irá</p>
                <p className="text-lg font-bold text-red-900 dark:text-red-100">{data.kpis.no_ira}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-orange-200 dark:border-orange-700 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">Retrasado</p>
                <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{data.kpis.retrasado}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPIs secundarios compactos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Users className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total</span>
                </div>
                <span className="text-sm font-bold text-blue-900 dark:text-blue-100">{data.kpis.total_turnos}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Cubiertos</span>
                </div>
                <span className="text-sm font-bold text-green-900 dark:text-green-100">{data.kpis.puestos_cubiertos}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Día</span>
                </div>
                <span className="text-sm font-bold text-amber-900 dark:text-amber-100">{data.kpis.turnos_dia}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Noche</span>
                </div>
                <span className="text-sm font-bold text-purple-900 dark:text-purple-100">{data.kpis.turnos_noche}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Indicador de última actualización */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Última actualización: {isMounted ? lastUpdate.toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : '--:--:--'}
        </p>
      </div>

      {/* Selector de vista - Mobile First Optimizado */}
      <Tabs value={vistaTurnos} onValueChange={(value: string) => setVistaTurnos(value as 'instalaciones' | 'todos' | 'dia_noche')} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-700">
          <TabsTrigger 
            value="dia_noche" 
            className="flex items-center gap-1 text-xs font-medium data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Día y Noche</span>
            <span className="sm:hidden">Día/Noche</span>
          </TabsTrigger>
          <TabsTrigger 
            value="instalaciones" 
            className="flex items-center gap-1 text-xs font-medium data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Building2 className="w-3 h-3" />
            <span className="hidden sm:inline">Por Instalación</span>
            <span className="sm:hidden">Instalación</span>
          </TabsTrigger>
          <TabsTrigger 
            value="todos" 
            className="flex items-center gap-1 text-xs font-medium data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            <Users className="w-3 h-3" />
            <span className="hidden sm:inline">Todos los Turnos</span>
            <span className="sm:hidden">Todos</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Contenido */}
      <div className="space-y-3">
        {vistaTurnos === 'instalaciones' ? (
          /* Vista por Instalaciones */
          <div className="space-y-3">
            {instalacionesFiltradas.map((instalacion) => (
              <Card key={instalacion.instalacion_id} className="border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm text-gray-900 dark:text-gray-100">
                    <span className="truncate">{instalacion.instalacion_nombre}</span>
                    <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs">
                      {instalacion.turnos.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {modoVista === 'lista' ? (
                    <div className="space-y-2">
                      {instalacion.turnos.map((turno) => (
                        <TurnoCard 
                          key={turno.pauta_id} 
                          turno={turno} 
                          onEstadoChange={handleEstadoChange}
                          onWhatsApp={handleWhatsApp}
                          onTelefono={handleTelefono}
                          onObservaciones={handleObservaciones}
                          modoVista="lista"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {instalacion.turnos.map((turno) => (
                        <TurnoCard 
                          key={turno.pauta_id} 
                          turno={turno} 
                          onEstadoChange={handleEstadoChange}
                          onWhatsApp={handleWhatsApp}
                          onTelefono={handleTelefono}
                          onObservaciones={handleObservaciones}
                          modoVista="grid"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {instalacionesFiltradas.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600 dark:text-gray-400">No se encontraron instalaciones</p>
              </div>
            )}
          </div>
        ) : vistaTurnos === 'dia_noche' ? (
          /* Vista por Día y Noche */
          <div className="space-y-4">
            {/* Turnos de Día */}
            <Card className="border-amber-200 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm text-amber-900 dark:text-amber-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span>Turnos de Día</span>
                  </div>
                  <Badge variant="outline" className="border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 text-xs">
                    {turnosPorDiaNoche.dia.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {modoVista === 'lista' ? (
                  <div className="space-y-2">
                    {turnosPorDiaNoche.dia.map((turno) => (
                      <TurnoCard 
                        key={turno.pauta_id} 
                        turno={turno} 
                        onEstadoChange={handleEstadoChange}
                        onWhatsApp={handleWhatsApp}
                        onTelefono={handleTelefono}
                        onObservaciones={handleObservaciones}
                        modoVista="lista"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {turnosPorDiaNoche.dia.map((turno) => (
                      <TurnoCard 
                        key={turno.pauta_id} 
                        turno={turno} 
                        onEstadoChange={handleEstadoChange}
                        onWhatsApp={handleWhatsApp}
                        onTelefono={handleTelefono}
                        onObservaciones={handleObservaciones}
                        modoVista="grid"
                      />
                    ))}
                  </div>
                )}
                
                {turnosPorDiaNoche.dia.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-amber-600 dark:text-amber-400">No hay turnos de día</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Turnos de Noche */}
            <Card className="border-blue-200 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm text-blue-900 dark:text-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Turnos de Noche</span>
                  </div>
                  <Badge variant="outline" className="border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 text-xs">
                    {turnosPorDiaNoche.noche.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {modoVista === 'lista' ? (
                  <div className="space-y-2">
                    {turnosPorDiaNoche.noche.map((turno) => (
                      <TurnoCard 
                        key={turno.pauta_id} 
                        turno={turno} 
                        onEstadoChange={handleEstadoChange}
                        onWhatsApp={handleWhatsApp}
                        onTelefono={handleTelefono}
                        onObservaciones={handleObservaciones}
                        modoVista="lista"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {turnosPorDiaNoche.noche.map((turno) => (
                      <TurnoCard 
                        key={turno.pauta_id} 
                        turno={turno} 
                        onEstadoChange={handleEstadoChange}
                        onWhatsApp={handleWhatsApp}
                        onTelefono={handleTelefono}
                        onObservaciones={handleObservaciones}
                        modoVista="grid"
                      />
                    ))}
                  </div>
                )}
                
                {turnosPorDiaNoche.noche.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400">No hay turnos de noche</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Vista de Todos los Turnos */
          <div className="space-y-2">
            {modoVista === 'lista' ? (
              <div className="space-y-2">
                {turnosFiltrados.map((turno) => (
                  <TurnoCard 
                    key={turno.pauta_id} 
                    turno={turno} 
                    onEstadoChange={handleEstadoChange}
                    onWhatsApp={handleWhatsApp}
                    onTelefono={handleTelefono}
                    onObservaciones={handleObservaciones}
                    modoVista="lista"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {turnosFiltrados.map((turno) => (
                  <TurnoCard 
                    key={turno.pauta_id} 
                    turno={turno} 
                    onEstadoChange={handleEstadoChange}
                    onWhatsApp={handleWhatsApp}
                    onTelefono={handleTelefono}
                    onObservaciones={handleObservaciones}
                    modoVista="grid"
                  />
                ))}
              </div>
            )}
            
            {turnosFiltrados.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600 dark:text-gray-400">No se encontraron turnos</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente minimalista para mostrar un turno
function TurnoCard({ 
  turno, 
  onEstadoChange, 
  onWhatsApp, 
  onTelefono, 
  onObservaciones,
  modoVista
}: {
  turno: Turno;
  onEstadoChange: (pautaId: string, estado: string) => void;
  onWhatsApp: (telefono: string, guardia: string) => void;
  onTelefono: (telefono: string) => void;
  onObservaciones: (pautaId: string, observaciones: string) => void;
  modoVista: 'lista' | 'grid';
}) {
  const [isMounted, setIsMounted] = useState(false);

  // Evitar error de hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const estadosSemaforo = [
    { value: 'pendiente', label: 'Pendiente', color: 'bg-gray-500', borderColor: 'border-gray-500' },
    { value: 'en_camino', label: 'En Camino', color: 'bg-yellow-500', borderColor: 'border-yellow-500' },
    { value: 'llego', label: 'Llegó', color: 'bg-green-500', borderColor: 'border-green-500' },
    { value: 'no_contesta', label: 'No Contesta', color: 'bg-red-500', borderColor: 'border-red-500' },
    { value: 'no_ira', label: 'No Irá', color: 'bg-red-600', borderColor: 'border-red-600' },
    { value: 'retrasado', label: 'Retrasado', color: 'bg-orange-500', borderColor: 'border-orange-500' }
  ];

  const estadoActual = estadosSemaforo.find(e => e.value === turno.estado_semaforo) || estadosSemaforo[0];

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5);
  };

  if (modoVista === 'grid') {
    return (
      <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg border-2 ${
        turno.tipo_turno === 'noche' 
          ? 'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20' 
          : 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20'
      }`}>
        <CardContent className="p-3">
          {/* Header compacto con información esencial */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {turno.guardia_nombre || 'Sin asignar'}
              </h4>
              <div className={`w-3 h-3 rounded-full ${estadoActual.color} shadow-sm`}></div>
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">
              {turno.puesto_nombre} • {turno.rol_nombre}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
              {turno.instalacion_nombre}
            </p>
            
            {/* Horario destacado */}
            <div className="text-center mb-3">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded">
                {formatearHora(turno.hora_inicio)} - {formatearHora(turno.hora_termino)}
              </p>
            </div>
          </div>

          {/* Selector de estado compacto */}
          <div className="mb-3">
            <Select 
              value={turno.estado_semaforo} 
              onValueChange={(value) => onEstadoChange(turno.pauta_id, value)}
            >
              <SelectTrigger className={`h-9 text-sm font-medium border-2 ${estadoActual.borderColor} bg-white dark:bg-gray-800 hover:shadow-md transition-shadow`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${estadoActual.color} shadow-sm`}></div>
                  <span className="font-semibold">{estadoActual.label}</span>
                </div>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </SelectTrigger>
              <SelectContent>
                {estadosSemaforo.map((estado) => (
                  <SelectItem key={estado.value} value={estado.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${estado.color} shadow-sm`}></div>
                      <span className="font-medium">{estado.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botones de acción compactos */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                const telefono = turno.guardia_telefono || turno.instalacion_telefono;
                if (telefono) {
                  onTelefono(telefono);
                } else {
                  toast.error('No hay teléfono disponible');
                }
              }} 
              className="flex-1 h-8 text-xs font-medium border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20" 
              disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            >
              📞 Llamar
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                const telefono = turno.guardia_telefono || turno.instalacion_telefono;
                if (telefono) {
                  onWhatsApp(telefono, turno.guardia_nombre || 'Guardia');
                } else {
                  toast.error('No hay teléfono disponible');
                }
              }} 
              className="flex-1 h-8 text-xs font-medium border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20" 
              disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            >
              💬 WhatsApp
            </Button>
          </div>

          {/* Observaciones compactas */}
          {turno.observaciones_semaforo && (
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 p-2 rounded mt-2 border border-gray-200 dark:border-gray-700">
              <strong>📝 Observaciones:</strong> {turno.observaciones_semaforo}
            </div>
          )}

          {/* Última actualización compacta */}
          {turno.ultima_actualizacion && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              🔄 {isMounted ? new Date(turno.ultima_actualizacion).toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit'
              }) : '--:--'}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Modo lista (diseño original)
  return (
    <div className={`relative p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-sm ${
      turno.tipo_turno === 'noche' 
        ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
        : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
    } ${estadoActual.borderColor}`}>
      
      {/* Header con información principal */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {turno.guardia_nombre || 'Sin asignar'}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {turno.puesto_nombre} • {turno.rol_nombre}
          </p>
          {/* Estado de la pauta diaria */}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Estado:</span>
            <Badge variant="outline" className="text-xs px-1 py-0 h-4">
              {turno.estado_pauta_ui}
            </Badge>
          </div>
        </div>
        
        <div className="text-right ml-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatearHora(turno.hora_inicio)} - {formatearHora(turno.hora_termino)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {turno.instalacion_nombre}
          </p>
        </div>
      </div>

      {/* Selector de estado - Cambio en tiempo real */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <Select 
            value={turno.estado_semaforo} 
            onValueChange={(value) => onEstadoChange(turno.pauta_id, value)}
          >
            <SelectTrigger className={`h-8 text-xs border-2 ${estadoActual.borderColor} bg-white dark:bg-gray-800`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${estadoActual.color}`}></div>
                <span>{estadoActual.label}</span>
              </div>
              <ChevronDown className="w-3 h-3 ml-auto" />
            </SelectTrigger>
            <SelectContent>
              {estadosSemaforo.map((estado) => (
                <SelectItem key={estado.value} value={estado.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${estado.color}`}></div>
                    {estado.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              const telefono = turno.guardia_telefono || turno.instalacion_telefono;
              if (telefono) {
                onTelefono(telefono);
              } else {
                toast.error('No hay teléfono disponible');
              }
            }} 
            className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
            disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            title="Llamar"
          >
            <Phone className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              const telefono = turno.guardia_telefono || turno.instalacion_telefono;
              if (telefono) {
                onWhatsApp(telefono, turno.guardia_nombre || 'Guardia');
              } else {
                toast.error('No hay teléfono disponible');
              }
            }} 
            className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
            disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            title="WhatsApp"
          >
            <MessageSquare className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Observaciones */}
      {turno.observaciones_semaforo && (
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
          <strong>Observaciones:</strong> {turno.observaciones_semaforo}
        </div>
      )}

      {/* Última actualización */}
      {turno.ultima_actualizacion && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Última actualización: {isMounted ? new Date(turno.ultima_actualizacion).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }) : '--:--:--'}
        </div>
      )}
    </div>
  );
}
