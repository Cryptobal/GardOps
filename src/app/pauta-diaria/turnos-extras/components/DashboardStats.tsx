'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Building, BarChart3, Target, Zap, AlertCircle } from 'lucide-react';

interface DashboardStatsProps {
  filtros: {
    fechaInicio: string;
    fechaFin: string;
    instalacion: string;
  };
}

interface Estadisticas {
  generales: {
    total_turnos: number;
    turnos_pagados: number;
    turnos_pendientes: number;
    monto_total: number;
    monto_pagado: number;
    monto_pendiente: number;
    promedio_por_turno: number;
    turnos_reemplazo: number;
    turnos_ppc: number;
  };
  porInstalacion: Array<{
    instalacion_nombre: string;
    total_turnos: number;
    monto_total: number;
    turnos_pagados: number;
    turnos_pendientes: number;
  }>;
  porMes: Array<{
    mes: string;
    total_turnos: number;
    monto_total: number;
    turnos_pagados: number;
    turnos_pendientes: number;
  }>;
  topGuardias: Array<{
    nombre: string;
    apellido_paterno: string;
    rut: string;
    total_turnos: number;
    monto_total: number;
    turnos_pagados: number;
    turnos_pendientes: number;
  }>;
}

export default function DashboardStats({ filtros }: DashboardStatsProps) {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'turnos' | 'montos' | 'guardias'>('turnos');

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.instalacion !== 'all') params.append('instalacion_id', filtros.instalacion);

      const response = await fetch(`/api/pauta-diaria/turno-extra/stats?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setEstadisticas(data.estadisticas);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
  }, [filtros]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No se pudieron cargar las estadísticas</p>
        </CardContent>
      </Card>
    );
  }

  const { generales } = estadisticas;
  const porcentajePendientes = generales.total_turnos > 0 ? (generales.turnos_pendientes / generales.total_turnos) * 100 : 0;
  const porcentajePagados = generales.total_turnos > 0 ? (generales.turnos_pagados / generales.total_turnos) * 100 : 0;
  const porcentajeReemplazos = generales.total_turnos > 0 ? (generales.turnos_reemplazo / generales.total_turnos) * 100 : 0;
  const porcentajePPC = generales.total_turnos > 0 ? (generales.turnos_ppc / generales.total_turnos) * 100 : 0;

  // Calcular indicadores de rendimiento
  const eficienciaPago = generales.total_turnos > 0 ? (generales.turnos_pagados / generales.total_turnos) * 100 : 0;
  const promedioMontoPorTurno = generales.total_turnos > 0 ? generales.monto_total / generales.total_turnos : 0;
  const ratioPendientes = generales.turnos_pendientes > 0 ? (generales.monto_pendiente / generales.turnos_pendientes) : 0;

  return (
    <div className="space-y-6">
      {/* Indicadores de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
              <Target className="h-4 w-4" />
              Eficiencia de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{eficienciaPago.toFixed(1)}%</div>
            <Progress value={eficienciaPago} className="mt-2" />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                {generales.turnos_pagados} de {generales.total_turnos}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-800">
              <Zap className="h-4 w-4" />
              Promedio por Turno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">${promedioMontoPorTurno.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                {generales.total_turnos} turnos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              Pendientes Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{generales.turnos_pendientes}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                ${ratioPendientes.toLocaleString()} promedio
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-800">
              <BarChart3 className="h-4 w-4" />
              Distribución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reemplazos</span>
                <span className="font-medium">{porcentajeReemplazos.toFixed(1)}%</span>
              </div>
              <Progress value={porcentajeReemplazos} className="h-1" />
              <div className="flex justify-between text-sm">
                <span>PPC</span>
                <span className="font-medium">{porcentajePPC.toFixed(1)}%</span>
              </div>
              <Progress value={porcentajePPC} className="h-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas Generales Mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{generales.total_turnos}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {generales.turnos_reemplazo} reemplazos
              </Badge>
              <Badge variant="outline" className="text-xs">
                {generales.turnos_ppc} PPC
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className={generales.turnos_pendientes > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-600">
              <TrendingDown className="h-4 w-4" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{generales.turnos_pendientes}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {porcentajePendientes.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                ${generales.monto_pendiente.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              Pagados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{generales.turnos_pagados}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {porcentajePagados.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                ${generales.monto_pagado.toLocaleString()}
              </span>
            </div>
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
            <div className="text-2xl font-bold">${generales.monto_total.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                ${generales.promedio_por_turno.toLocaleString()} promedio
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selector de Métricas */}
      <div className="flex gap-2">
        <Button
          variant={selectedMetric === 'turnos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMetric('turnos')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Por Turnos
        </Button>
        <Button
          variant={selectedMetric === 'montos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMetric('montos')}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Por Montos
        </Button>
        <Button
          variant={selectedMetric === 'guardias' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedMetric('guardias')}
        >
          <Users className="h-4 w-4 mr-2" />
          Por Guardias
        </Button>
      </div>

      {/* Top Instalaciones y Guardias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Instalaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Top Instalaciones
            </CardTitle>
            <CardDescription>
              Instalaciones con más turnos extras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {estadisticas.porInstalacion.slice(0, 5).map((instalacion, index) => (
                <div key={instalacion.instalacion_nombre} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">{instalacion.instalacion_nombre}</div>
                      <div className="text-sm text-muted-foreground">
                        {instalacion.total_turnos} turnos
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${instalacion.monto_total.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {instalacion.turnos_pendientes} pendientes
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            <div className="space-y-3">
              {estadisticas.topGuardias.slice(0, 5).map((guardia, index) => (
                <div key={guardia.rut} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {guardia.nombre} {guardia.apellido_paterno}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {guardia.rut} • {guardia.total_turnos} turnos
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${guardia.monto_total.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {guardia.turnos_pendientes} pendientes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas por Mes */}
      {estadisticas.porMes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolución Mensual
            </CardTitle>
            <CardDescription>
              Turnos extras por mes (últimos 12 meses)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {estadisticas.porMes.map((mes) => (
                <div key={mes.mes} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {new Date(mes.mes).toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {mes.total_turnos} turnos • {mes.turnos_pagados} pagados
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${mes.monto_total.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {mes.turnos_pendientes} pendientes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 