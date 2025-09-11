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
      {/* Header con controles - Mobile First */}
      <div className="space-y-2">
        {/* Controles de navegación de fecha - Mobile First */}
        <div className="flex items-center justify-between gap-2">
          {/* Navegación de fecha */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => go(-1)} className="h-8 w-8 p-0">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => go(1)} className="h-8 w-8 p-0">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Selector de fecha compacto */}
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              type="date"
              className="w-auto text-xs h-8 px-2"
              value={fecha}
              onChange={(e) => goToDate(e.target.value)}
            />
            <Button
              aria-label="Abrir calendario"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.showPicker?.()}
              className="h-8 w-8 p-0"
            >
              <Calendar className="h-3 w-3" />
            </Button>
          </div>
          
        </div>

        {/* Botones y controles centrados */}
        <div className="flex items-center justify-center gap-2">
          {/* Botón Hoy */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => goToDate(toYmd(new Date()))}
            className="h-8 px-2 text-xs"
          >
            Hoy
          </Button>

          {/* KPI Total */}
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total:</span>
            <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{data?.kpis.total_turnos || 0}</span>
          </div>
        </div>

        {/* Botón Ver Libres */}
        <div className="flex items-center justify-start">
          <Button
            onClick={() => setIncluirLibres(!incluirLibres)}
            variant={incluirLibres ? "default" : "outline"}
            size="sm"
            className="h-8 px-3 flex-shrink-0"
          >
            <Eye className="w-3 h-3 mr-1" />
            <span className="text-xs">Ver Libres</span>
          </Button>
        </div>

        {/* Selector de modo vista */}
        <div className="flex items-center gap-1">
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
        </div>
      </div>

      {/* KPIs optimizados para móvil - Grid responsive */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Card className="border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center space-y-1">
              <Clock className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Pendiente</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{data.kpis.pendiente}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/50">
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center space-y-1">
              <Clock className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">En Camino</p>
              <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">{data.kpis.en_camino}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50">
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center space-y-1">
              <Activity className="w-3 h-3 text-green-600 dark:text-green-400" />
              <p className="text-xs font-medium text-green-700 dark:text-green-300">Llegó</p>
              <p className="text-sm font-bold text-green-800 dark:text-green-200">{data.kpis.llego}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50">
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center space-y-1">
              <Activity className="w-3 h-3 text-red-600 dark:text-red-400" />
              <p className="text-xs font-medium text-red-700 dark:text-red-300">No Contesta</p>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">{data.kpis.no_contesta}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-600 dark:border-red-800 bg-red-100/50 dark:bg-red-950/50">
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center space-y-1">
              <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
              <p className="text-xs font-medium text-red-700 dark:text-red-300">No Irá</p>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">{data.kpis.no_ira}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/50">
          <CardContent className="p-2">
            <div className="flex flex-col items-center text-center space-y-1">
              <Clock className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Retrasado</p>
              <p className="text-sm font-bold text-orange-800 dark:text-orange-200">{data.kpis.retrasado}</p>
            </div>
          </CardContent>
        </Card>
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

      {/* Selector de vista */}
      <Tabs value={vistaTurnos} onValueChange={(value: string) => setVistaTurnos(value as 'instalaciones' | 'todos' | 'dia_noche')} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="dia_noche" className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Día y Noche</span>
            <span className="sm:hidden">Día/Noche</span>
          </TabsTrigger>
          <TabsTrigger value="instalaciones" className="flex items-center gap-1 text-xs">
            <Building2 className="w-3 h-3" />
            <span className="hidden sm:inline">Por Instalación</span>
            <span className="sm:hidden">Instalación</span>
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex items-center gap-1 text-xs">
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
      <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
        turno.tipo_turno === 'noche' ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/30' : 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/30'
      }`}>
        <CardContent className="p-3">
          {/* Header con información principal */}
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
              {turno.guardia_nombre || 'Sin asignar'}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
              {turno.puesto_nombre} • {turno.rol_nombre}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
              {turno.instalacion_nombre}
            </p>
            {/* Estado de la pauta diaria */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Estado:</span>
              <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                {turno.estado_pauta_ui}
              </Badge>
            </div>
          </div>

          {/* Horario */}
          <div className="text-center mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatearHora(turno.hora_inicio)} - {formatearHora(turno.hora_termino)}
            </p>
          </div>

          {/* Selector de estado */}
          <div className="mb-3">
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
              className="flex-1 h-7 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
              disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            >
              <Phone className="w-3 h-3 mr-1" />
              Llamar
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
              className="flex-1 h-7 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
              disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              WhatsApp
            </Button>
          </div>

          {/* Observaciones */}
          {turno.observaciones_semaforo && (
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded mt-2">
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
