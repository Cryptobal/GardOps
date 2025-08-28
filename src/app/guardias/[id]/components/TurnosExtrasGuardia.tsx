'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTurnosExtras, type TurnoExtra } from '@/hooks/useTurnosExtras';
import { Clock, Calendar, DollarSign, Building, Search, Filter, Download, RefreshCw } from 'lucide-react';

interface TurnosExtrasGuardiaProps {
  guardiaId: string;
  guardiaNombre: string;
}

export default function TurnosExtrasGuardia({ guardiaId, guardiaNombre }: TurnosExtrasGuardiaProps) {
  const [turnosExtras, setTurnosExtras] = useState<TurnoExtra[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: 'all' as 'reemplazo' | 'ppc' | 'all',
    pagado: 'all' as 'true' | 'false' | 'all',
    instalacion: 'all'
  });
  const [showFiltros, setShowFiltros] = useState(false);
  const [instalaciones, setInstalaciones] = useState<Array<{ id: string; nombre: string }>>([]);
  const { toast } = useToast();

  // Cargar turnos extras del guardia
  const cargarTurnosExtras = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        guardia_id: guardiaId,
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`/api/pauta-diaria/turno-extra?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cargando turnos extras');
      }

      setTurnosExtras(data.turnos_extras || []);
    } catch (error) {
      console.error('Error cargando turnos extras:', error);
      toast({
        title: "Error",
        description: "Error cargando turnos extras",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar instalaciones para filtros
  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/instalaciones?simple=true');
      const data = await response.json();
      if (response.ok) {
        setInstalaciones(data.instalaciones || []);
      }
    } catch (error) {
      console.error('Error cargando instalaciones:', error);
    }
  };

  // Exportar CSV
  const exportarCSV = async () => {
    try {
      const params = new URLSearchParams({
        guardia_id: guardiaId,
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`/api/pauta-diaria/turno-extra/exportar?${params}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error exportando datos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `turnos_extras_${guardiaNombre}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "✅ Exportación completada",
        description: "Archivo CSV descargado correctamente",
        duration: 3000
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error exportando datos",
        variant: "destructive"
      });
    }
  };

  // Calcular estadísticas
  const calcularEstadisticas = () => {
    const total = turnosExtras.length;
    const pendientes = turnosExtras.filter(t => !t.pagado).length;
    const pagados = turnosExtras.filter(t => t.pagado).length;
    const montoTotal = turnosExtras.reduce((sum, t) => sum + Number(t.valor), 0);
    const montoPendiente = turnosExtras.filter(t => !t.pagado).reduce((sum, t) => sum + Number(t.valor), 0);
    const montoPagado = turnosExtras.filter(t => t.pagado).reduce((sum, t) => sum + Number(t.valor), 0);

    return {
      total,
      pendientes,
      pagados,
      montoTotal,
      montoPendiente,
      montoPagado
    };
  };

  useEffect(() => {
    cargarTurnosExtras();
    cargarInstalaciones();
  }, [guardiaId, filtros]);

  const estadisticas = calcularEstadisticas();

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Turnos Extras - {guardiaNombre}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{estadisticas.total}</div>
              <div className="text-sm text-gray-600">Total Turnos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{estadisticas.pendientes}</div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{estadisticas.pagados}</div>
              <div className="text-sm text-gray-600">Pagados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${estadisticas.montoTotal.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Monto Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiltros(!showFiltros)}
            >
              {showFiltros ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </CardHeader>
        {showFiltros && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Fecha Inicio */}
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                />
              </div>

              {/* Fecha Fin */}
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                />
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filtros.estado} onValueChange={(value: 'reemplazo' | 'ppc' | 'all') => setFiltros({ ...filtros, estado: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="reemplazo">Reemplazo</SelectItem>
                    <SelectItem value="ppc">PPC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pagado */}
              <div className="space-y-2">
                <Label>Pagado</Label>
                <Select value={filtros.pagado} onValueChange={(value: 'true' | 'false' | 'all') => setFiltros({ ...filtros, pagado: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Pagados</SelectItem>
                    <SelectItem value="false">Pendientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Instalación */}
              <div className="space-y-2">
                <Label>Instalación</Label>
                <Select value={filtros.instalacion} onValueChange={(value) => setFiltros({ ...filtros, instalacion: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {instalaciones.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Acciones */}
      <div className="flex gap-2">
        <Button onClick={cargarTurnosExtras} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Actualizar
        </Button>
        <Button onClick={exportarCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Lista de turnos extras */}
      <Card>
        <CardHeader>
          <CardTitle>Turnos Extras ({turnosExtras.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Cargando turnos extras...</p>
            </div>
          ) : turnosExtras.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay turnos extras registrados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {turnosExtras.map((turno) => (
                <div key={turno.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{turno.fecha}</span>
                        <Badge variant={turno.estado === 'reemplazo' ? 'destructive' : 'default'}>
                          {turno.estado === 'reemplazo' ? 'Reemplazo' : 'PPC'}
                        </Badge>
                        <Badge variant={turno.pagado ? 'default' : 'secondary'}>
                          {turno.pagado ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {turno.instalacion_nombre}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${turno.valor.toLocaleString()}
                        </div>
                        {turno.fecha_pago && (
                          <div className="text-green-600">
                            Pagado: {turno.fecha_pago}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
} 