'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Download, Filter, RefreshCw, Eye, EyeOff, TrendingUp, DollarSign, Calendar, User, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import NavigationTabs from '../components/NavigationTabs';

interface PagoTurnoExtra {
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
  valor: number;
  pagado: boolean;
  fecha_pago: string;
  observaciones_pago: string | null;
  usuario_pago: string;
  created_at: string;
}

export default function HistorialPagosPage() {
  const [pagos, setPagos] = useState<PagoTurnoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: 'all',
    instalacion: 'all',
    busqueda: '',
    usuario: 'all'
  });
  const [estadisticas, setEstadisticas] = useState({
    totalPagos: 0,
    montoTotal: 0,
    promedioPorPago: 0,
    pagosEsteMes: 0,
    montoEsteMes: 0
  });
  const [showFiltros, setShowFiltros] = useState(false);

  const { toast } = useToast();

  // Cargar historial de pagos
  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.estado !== 'all') params.append('estado', filtros.estado);
      if (filtros.instalacion !== 'all') params.append('instalacion_id', filtros.instalacion);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros.usuario !== 'all') params.append('usuario', filtros.usuario);
      params.append('solo_pagados', 'true');

      const response = await fetch(`/api/pauta-diaria/turno-extra?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setPagos(data.turnos_extras || []);
        calcularEstadisticas(data.turnos_extras || []);
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "Error al cargar historial de pagos",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const calcularEstadisticas = (pagosData: PagoTurnoExtra[]) => {
    const totalPagos = pagosData.length;
    const montoTotal = pagosData.reduce((sum, p) => sum + Number(p.valor), 0);
    const promedioPorPago = totalPagos > 0 ? montoTotal / totalPagos : 0;
    
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const pagosEsteMes = pagosData.filter(p => new Date(p.fecha_pago) >= inicioMes).length;
    const montoEsteMes = pagosData
      .filter(p => new Date(p.fecha_pago) >= inicioMes)
      .reduce((sum, p) => sum + Number(p.valor), 0);

    setEstadisticas({
      totalPagos,
      montoTotal,
      promedioPorPago,
      pagosEsteMes,
      montoEsteMes
    });
  };

  // Exportar CSV del historial
  const exportarCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.estado !== 'all') params.append('estado', filtros.estado);
      if (filtros.instalacion !== 'all') params.append('instalacion_id', filtros.instalacion);
      params.append('solo_pagados', 'true');

      const response = await fetch(`/api/pauta-diaria/turno-extra/exportar?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_pagos_turnos_extras_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "📊 CSV exportado",
          description: "Historial de pagos descargado exitosamente",
        });
      } else {
        toast({
          title: "❌ Error",
          description: "Error al exportar CSV",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      estado: 'all',
      instalacion: 'all',
      busqueda: '',
      usuario: 'all'
    });
  };

  useEffect(() => {
    cargarHistorial();
  }, [filtros]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Tabs */}
      <NavigationTabs />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Historial de Pagos</h1>
          <p className="text-muted-foreground">
            Registro completo de pagos de turnos extras realizados
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.href = '/pauta-diaria/turnos-extras'} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={cargarHistorial} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button onClick={exportarCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.totalPagos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${estadisticas.montoTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${estadisticas.promedioPorPago.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Pagos Este Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{estadisticas.pagosEsteMes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monto Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${estadisticas.montoEsteMes.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

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
              {showFiltros ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showFiltros && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Fecha Inicio */}
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
                />
              </div>

              {/* Fecha Fin */}
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))}
                />
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filtros.estado} onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}>
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

              {/* Búsqueda */}
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Nombre, RUT, instalación..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                />
              </div>

              {/* Usuario */}
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Select value={filtros.usuario} onValueChange={(value) => setFiltros(prev => ({ ...prev, usuario: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="admin@test.com">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Limpiar Filtros */}
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  variant="outline" 
                  onClick={limpiarFiltros}
                  className="w-full"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabla de Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>
            Lista de pagos realizados ({pagos.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : pagos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay pagos registrados</p>
              <p className="text-sm">Ajusta los filtros para ver más resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Guardia</th>
                    <th className="text-left p-2">Instalación</th>
                    <th className="text-left p-2">Puesto</th>
                    <th className="text-left p-2">Fecha Turno</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Valor</th>
                    <th className="text-left p-2">Fecha Pago</th>
                    <th className="text-left p-2">Usuario</th>
                    <th className="text-left p-2">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">
                            {pago.guardia_nombre} {pago.guardia_apellido_paterno}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {pago.guardia_rut}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">{pago.instalacion_nombre}</td>
                      <td className="p-2">{pago.nombre_puesto}</td>
                      <td className="p-2">{format(new Date(pago.fecha), 'dd/MM/yyyy')}</td>
                      <td className="p-2">
                        <Badge variant={pago.estado === 'reemplazo' ? 'default' : 'secondary'}>
                          {pago.estado.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2 font-medium text-green-600">${pago.valor.toLocaleString()}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">
                            {format(new Date(pago.fecha_pago), 'dd/MM/yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(pago.fecha_pago), 'HH:mm')}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{pago.usuario_pago}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        {pago.observaciones_pago ? (
                          <div className="text-sm text-muted-foreground max-w-xs truncate" title={pago.observaciones_pago}>
                            {pago.observaciones_pago}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 