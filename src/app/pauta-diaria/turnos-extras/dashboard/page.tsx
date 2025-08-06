'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  Bug
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NavigationTabs from '../components/NavigationTabs';

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

interface EstadisticasDashboard {
  totalTurnos: number;
  totalMonto: number;
  promedioPorTurno: number;
  turnosPorMes: Array<{ mes: string; cantidad: number; monto: number }>;
  turnosPorSemana: Array<{ semana: string; cantidad: number; monto: number }>;
  turnosPorInstalacion: Array<{ instalacion: string; cantidad: number; monto: number }>;
  turnosPorEstado: Array<{ estado: string; cantidad: number; monto: number }>;
  topGuardias: Array<{ guardia: string; cantidad: number; monto: number }>;
  evolucionPagos: Array<{ fecha: string; pagados: number; noPagados: number; montoPagado: number; montoNoPagado: number }>;
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

export default function DashboardPage() {
  const [turnosExtras, setTurnosExtras] = useState<TurnoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    periodo: '12', // Últimos 12 meses por defecto
    instalacion: 'all',
    estado: 'all'
  });
  const [estadisticas, setEstadisticas] = useState<EstadisticasDashboard>({
    totalTurnos: 0,
    totalMonto: 0,
    promedioPorTurno: 0,
    turnosPorMes: [],
    turnosPorSemana: [],
    turnosPorInstalacion: [],
    turnosPorEstado: [],
    topGuardias: [],
    evolucionPagos: []
  });

  const { success, error: toastError } = useToast();

  // Función para probar datos
  const testData = async () => {
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra/test');
      const data = await response.json();
      console.log('🧪 Test Data:', data);
      return data;
    } catch (err) {
      console.error('Error en test:', err);
      return null;
    }
  };

  // Cargar datos del dashboard
  const cargarDatosDashboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Cargando datos del dashboard...');
      console.log('🔄 Filtros:', filtros);

      const params = new URLSearchParams();
      params.append('periodo', filtros.periodo);
      if (filtros.instalacion !== 'all') params.append('instalacion_id', filtros.instalacion);
      if (filtros.estado !== 'all') params.append('estado', filtros.estado);

      const url = `/api/pauta-diaria/turno-extra/dashboard?${params.toString()}`;
      console.log('🔄 URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('📊 Response del dashboard:', data);

      if (response.ok) {
        if (data.success) {
          setTurnosExtras(data.turnos_extras || []);
          calcularEstadisticasDashboard(data.turnos_extras || []);
          console.log('✅ Datos cargados exitosamente:', data.turnos_extras?.length || 0, 'turnos');
        } else {
          setError(data.error || 'Error al cargar datos');
          console.error('❌ Error en respuesta:', data);
        }
      } else {
        setError(data.error || 'Error de conexión');
        console.error('❌ Error HTTP:', response.status, data);
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas del dashboard
  const calcularEstadisticasDashboard = (turnos: TurnoExtra[]) => {
    console.log('📊 Calculando estadísticas para', turnos.length, 'turnos');
    
    const totalTurnos = turnos.length;
    const totalMonto = turnos.reduce((sum, t) => sum + Number(t.valor), 0);
    const promedioPorTurno = totalTurnos > 0 ? totalMonto / totalTurnos : 0;

    // Agrupar por mes
    const turnosPorMes = turnos.reduce((acc, turno) => {
      const fecha = new Date(turno.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const mesNombre = fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      
      if (!acc[mesKey]) {
        acc[mesKey] = { mes: mesNombre, cantidad: 0, monto: 0 };
      }
      acc[mesKey].cantidad++;
      acc[mesKey].monto += Number(turno.valor);
      
      return acc;
    }, {} as Record<string, { mes: string; cantidad: number; monto: number }>);

    // Agrupar por instalación
    const turnosPorInstalacion = turnos.reduce((acc, turno) => {
      const instalacionNombre = turno.instalacion_nombre || 'Sin instalación';
      if (!acc[instalacionNombre]) {
        acc[instalacionNombre] = { instalacion: instalacionNombre, cantidad: 0, monto: 0 };
      }
      acc[instalacionNombre].cantidad++;
      acc[instalacionNombre].monto += Number(turno.valor);
      
      return acc;
    }, {} as Record<string, { instalacion: string; cantidad: number; monto: number }>);

    // Agrupar por estado de pago
    const turnosPorEstado = turnos.reduce((acc, turno) => {
      let estado = 'No pagado';
      if (turno.pagado) estado = 'Pagado';
      else if (turno.planilla_id) estado = 'Pendiente';
      
      if (!acc[estado]) {
        acc[estado] = { estado, cantidad: 0, monto: 0 };
      }
      acc[estado].cantidad++;
      acc[estado].monto += Number(turno.valor);
      
      return acc;
    }, {} as Record<string, { estado: string; cantidad: number; monto: number }>);

    // Top guardias
    const topGuardias = turnos.reduce((acc, turno) => {
      const nombreCompleto = `${turno.guardia_nombre || 'Sin nombre'} ${turno.guardia_apellido_paterno || ''}`;
      
      if (!acc[nombreCompleto]) {
        acc[nombreCompleto] = { guardia: nombreCompleto, cantidad: 0, monto: 0 };
      }
      acc[nombreCompleto].cantidad++;
      acc[nombreCompleto].monto += Number(turno.valor);
      
      return acc;
    }, {} as Record<string, { guardia: string; cantidad: number; monto: number }>);

    const nuevasEstadisticas = {
      totalTurnos,
      totalMonto,
      promedioPorTurno,
      turnosPorMes: Object.values(turnosPorMes).sort((a, b) => b.cantidad - a.cantidad),
      turnosPorSemana: [], // Se calculará por separado
      turnosPorInstalacion: Object.values(turnosPorInstalacion).sort((a, b) => b.cantidad - a.cantidad),
      turnosPorEstado: Object.values(turnosPorEstado),
      topGuardias: Object.values(topGuardias).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10),
      evolucionPagos: [] // Se calculará por separado
    };

    console.log('📊 Estadísticas calculadas:', nuevasEstadisticas);
    setEstadisticas(nuevasEstadisticas);
  };

  useEffect(() => {
    cargarDatosDashboard();
  }, [filtros]);

  // Función para debug
  const handleDebug = async () => {
    console.log('🐛 Iniciando debug...');
    const testResult = await testData();
    if (testResult) {
      console.log('🐛 Resultado del test:', testResult);
      if (testResult.total_turnos === 0) {
        toastError("⚠️ Sin datos", "No hay turnos extras registrados en la base de datos");
      } else {
        success("✅ Datos encontrados", `Hay ${testResult.total_turnos} turnos extras registrados`);
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Tabs */}
      <NavigationTabs />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Turnos Extras</h1>
          <p className="text-muted-foreground">
            Análisis Big Data y métricas avanzadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={cargarDatosDashboard} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button onClick={handleDebug} variant="outline" size="sm">
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-600/50 bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros del Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros del Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período de Análisis</Label>
              <Select 
                value={filtros.periodo} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, periodo: value }))}
              >
                <SelectTrigger id="periodo">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Últimos 12 meses</SelectItem>
                  <SelectItem value="24">Últimos 24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instalacion-dashboard">Instalación</Label>
              <Select 
                value={filtros.instalacion} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion: value }))}
              >
                <SelectTrigger id="instalacion-dashboard">
                  <SelectValue placeholder="Todas las instalaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {/* Aquí se cargarían las instalaciones dinámicamente */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado-dashboard">Estado</Label>
              <Select 
                value={filtros.estado} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger id="estado-dashboard">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="reemplazo">Reemplazo</SelectItem>
                  <SelectItem value="ppc">PPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-900/20 border-blue-600/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-100">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              Total Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{estadisticas.totalTurnos}</div>
            <p className="text-xs text-blue-300 mt-1">En el período seleccionado</p>
          </CardContent>
        </Card>

        <Card className="bg-green-900/20 border-green-600/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-100">
              <DollarSign className="h-4 w-4 text-green-400" />
              Monto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(estadisticas.totalMonto)}</div>
            <p className="text-xs text-green-300 mt-1">Valor acumulado</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-900/20 border-yellow-600/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-100">
              <TrendingUp className="h-4 w-4 text-yellow-400" />
              Promedio por Turno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{formatCurrency(estadisticas.promedioPorTurno)}</div>
            <p className="text-xs text-yellow-300 mt-1">Valor promedio</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-900/20 border-purple-600/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-100">
              <Users className="h-4 w-4 text-purple-400" />
              Guardias Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{estadisticas.topGuardias.length}</div>
            <p className="text-xs text-purple-300 mt-1">Con turnos extras</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos y Análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnos por Mes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Turnos por Mes
            </CardTitle>
            <CardDescription>
              Distribución de turnos extras por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {estadisticas.turnosPorMes.length > 0 ? (
              <div className="space-y-3">
                {estadisticas.turnosPorMes.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">{item.mes}</div>
                      <div className="text-sm text-muted-foreground">{item.cantidad} turnos</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.monto)}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.cantidad > 0 ? formatCurrency(item.monto / item.cantidad) : '$0'} promedio
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay datos para mostrar</p>
                <p className="text-sm">No se encontraron turnos extras en el período seleccionado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Instalaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Top Instalaciones
            </CardTitle>
            <CardDescription>
              Instalaciones con más turnos extras
            </CardDescription>
          </CardHeader>
          <CardContent>
            {estadisticas.turnosPorInstalacion.length > 0 ? (
              <div className="space-y-3">
                {estadisticas.turnosPorInstalacion.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">{item.instalacion}</div>
                      <div className="text-sm text-muted-foreground">{item.cantidad} turnos</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.monto)}</div>
                      <Badge variant="outline" className="ml-2">
                        {estadisticas.totalTurnos > 0 ? ((item.cantidad / estadisticas.totalTurnos) * 100).toFixed(1) : '0'}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay datos para mostrar</p>
                <p className="text-sm">No se encontraron instalaciones con turnos extras</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado de Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Estado de Pagos
            </CardTitle>
            <CardDescription>
              Distribución por estado de pago
            </CardDescription>
          </CardHeader>
          <CardContent>
            {estadisticas.turnosPorEstado.length > 0 ? (
              <div className="space-y-3">
                {estadisticas.turnosPorEstado.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        item.estado === 'Pagado' ? 'bg-green-500' :
                        item.estado === 'Pendiente' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium">{item.estado}</div>
                        <div className="text-sm text-muted-foreground">{item.cantidad} turnos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.monto)}</div>
                      <Badge variant="outline" className="ml-2">
                        {estadisticas.totalTurnos > 0 ? ((item.cantidad / estadisticas.totalTurnos) * 100).toFixed(1) : '0'}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay datos para mostrar</p>
                <p className="text-sm">No se encontraron turnos extras con estados de pago</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Guardias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Guardias
            </CardTitle>
            <CardDescription>
              Guardias con más turnos extras
            </CardDescription>
          </CardHeader>
          <CardContent>
            {estadisticas.topGuardias.length > 0 ? (
              <div className="space-y-3">
                {estadisticas.topGuardias.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">{item.guardia}</div>
                      <div className="text-sm text-muted-foreground">{item.cantidad} turnos</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.monto)}</div>
                      <Badge variant="outline" className="ml-2">
                        {estadisticas.totalTurnos > 0 ? ((item.cantidad / estadisticas.totalTurnos) * 100).toFixed(1) : '0'}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay datos para mostrar</p>
                <p className="text-sm">No se encontraron guardias con turnos extras</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Análisis de Tendencias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Análisis de Tendencias
          </CardTitle>
          <CardDescription>
            Evolución semanal de turnos extras y pagos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Gráficos de tendencias en desarrollo</p>
            <p className="text-sm">Próximamente: Gráficos interactivos de evolución semanal</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 