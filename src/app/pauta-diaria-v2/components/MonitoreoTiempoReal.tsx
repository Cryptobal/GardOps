'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

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

export function MonitoreoTiempoReal() {
  const [data, setData] = useState<MonitoreoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [vistaTurnos, setVistaTurnos] = useState<'instalaciones' | 'todos'>('instalaciones');
  const [modoVista, setModoVista] = useState<'lista' | 'grid'>('grid'); // Grid por defecto
  const [filtroTurno, setFiltroTurno] = useState<'todos' | 'dia' | 'noche'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        fecha,
        ...(filtroTurno !== 'todos' && { turno: filtroTurno })
      });

      console.log('🔍 Cargando datos de control de asistencias...');
      const response = await fetch(`/api/pauta-diaria-v2/monitoreo-tiempo-real?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Datos recibidos:', result);
      
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
  }, [fecha, filtroTurno]);

  // Auto-refresh con intervalo más frecuente para tiempo real
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(cargarDatos, 10000); // 10 segundos para tiempo real
    return () => clearInterval(interval);
  }, [autoRefresh, cargarDatos]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Escuchar cambios en otras pestañas usando localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pauta-diaria-update' && e.newValue) {
        const updateData = JSON.parse(e.newValue);
        if (updateData.fecha === fecha) {
          console.log('🔄 Actualización detectada desde otra pestaña');
          cargarDatos();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fecha, cargarDatos]);

  // Filtrar turnos
  const turnosFiltrados = useMemo(() => {
    if (!data) return [];

    let turnos = data.turnos;

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      turnos = turnos.filter(turno => turno.estado_semaforo === filtroEstado);
    }

    // Filtro por búsqueda
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      turnos = turnos.filter(turno => 
        turno.instalacion_nombre.toLowerCase().includes(searchLower) ||
        turno.guardia_nombre.toLowerCase().includes(searchLower) ||
        turno.puesto_nombre.toLowerCase().includes(searchLower)
      );
    }

    return turnos;
  }, [data, filtroEstado, busqueda]);

  // Filtrar instalaciones
  const instalacionesFiltradas = useMemo(() => {
    if (!data) return [];

    let instalaciones = data.instalaciones;

    // Filtro por búsqueda
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      instalaciones = instalaciones.filter(instalacion => 
        instalacion.instalacion_nombre.toLowerCase().includes(searchLower) ||
        instalacion.turnos.some(turno => 
          turno.guardia_nombre.toLowerCase().includes(searchLower) ||
          turno.puesto_nombre.toLowerCase().includes(searchLower)
        )
      );
    }

    return instalaciones;
  }, [data, busqueda]);

  const handleEstadoChange = async (pautaId: string, estado: string) => {
    try {
      console.log('Actualizando estado:', { pautaId, estado });
      
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
        
        // Notificar a otras pestañas sobre el cambio
        const updateNotification = {
          fecha: fecha,
          pauta_id: pautaId,
          estado: estado,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('pauta-diaria-update', JSON.stringify(updateNotification));
        
        // Recargar datos para mostrar el cambio
        await cargarDatos();
      } else {
        throw new Error(result.error || 'Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
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
      console.log('Actualizando observaciones:', { pautaId, observaciones });
      toast.success('Observaciones actualizadas');
      
      // Recargar datos
      await cargarDatos();
    } catch (error) {
      console.error('Error actualizando observaciones:', error);
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
      {/* Header con controles */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              onClick={cargarDatos} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="h-8 px-2"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className="h-8 px-2"
            >
              <Clock className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">{autoRefresh ? 'Auto ON' : 'Auto OFF'}</span>
            </Button>

            {/* KPI Total arriba */}
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total:</span>
              <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{data?.kpis.total_turnos || 0}</span>
            </div>
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

        {/* Filtros */}
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Buscar instalación, guardia o puesto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full"
          />
          
          <div className="flex gap-2">
            <Select value={filtroTurno} onValueChange={(value: 'todos' | 'dia' | 'noche') => setFiltroTurno(value)}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="dia">Día</SelectItem>
                <SelectItem value="noche">Noche</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_camino">En camino</SelectItem>
                <SelectItem value="llego">Llegó</SelectItem>
                <SelectItem value="no_contesta">No contesta</SelectItem>
                <SelectItem value="no_ira">No irá</SelectItem>
                <SelectItem value="retrasado">Retrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs con consistencia de nombres */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Pendiente</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{data.kpis.pendiente}</p>
              </div>
              <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">En Camino</p>
                <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{data.kpis.en_camino}</p>
              </div>
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-300">Llegó</p>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">{data.kpis.llego}</p>
              </div>
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-300">No Contesta</p>
                <p className="text-lg font-bold text-red-800 dark:text-red-200">{data.kpis.no_contesta}</p>
              </div>
              <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-600 dark:border-red-800 bg-red-100/50 dark:bg-red-950/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-300">No Irá</p>
                <p className="text-lg font-bold text-red-800 dark:text-red-200">{data.kpis.no_ira}</p>
              </div>
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Retrasado</p>
                <p className="text-lg font-bold text-orange-800 dark:text-orange-200">{data.kpis.retrasado}</p>
              </div>
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicador de última actualización */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* Selector de vista */}
      <Tabs value={vistaTurnos} onValueChange={(value: string) => setVistaTurnos(value as 'instalaciones' | 'todos')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
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
              {turno.guardia_nombre}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
              {turno.puesto_nombre} • {turno.rol_nombre}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {turno.instalacion_nombre}
            </p>
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
              onClick={() => onTelefono(turno.guardia_telefono || turno.instalacion_telefono || '')} 
              className="flex-1 h-7 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
              disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            >
              <Phone className="w-3 h-3 mr-1" />
              Llamar
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onWhatsApp(turno.guardia_telefono || turno.instalacion_telefono || '', turno.guardia_nombre)} 
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
              Última actualización: {new Date(turno.ultima_actualizacion).toLocaleTimeString()}
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
            {turno.guardia_nombre}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {turno.puesto_nombre} • {turno.rol_nombre}
          </p>
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
            onClick={() => onTelefono(turno.guardia_telefono || turno.instalacion_telefono || '')} 
            className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
            disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            title="Llamar"
          >
            <Phone className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onWhatsApp(turno.guardia_telefono || turno.instalacion_telefono || '', turno.guardia_nombre)} 
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
          Última actualización: {new Date(turno.ultima_actualizacion).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
