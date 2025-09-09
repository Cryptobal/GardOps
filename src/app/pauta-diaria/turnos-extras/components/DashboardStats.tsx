"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

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
      logger.error('Error cargando estadísticas::', error);
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
  const porcentajePendientes = generales.total_turnos > 0 ? Math.round((generales.turnos_pendientes / generales.total_turnos) * 100) : 0;
  const porcentajePagados = generales.total_turnos > 0 ? Math.round((generales.turnos_pagados / generales.total_turnos) * 100) : 0;
  const porcentajeReemplazos = generales.total_turnos > 0 ? Math.round((generales.turnos_reemplazo / generales.total_turnos) * 100) : 0;
  const porcentajePPC = generales.total_turnos > 0 ? Math.round((generales.turnos_ppc / generales.total_turnos) * 100) : 0;

  // Calcular indicadores de rendimiento
  const eficienciaPago = generales.total_turnos > 0 ? (generales.turnos_pagados / generales.total_turnos) * 100 : 0;
  const toInt = (val: any) => {
    const n = typeof val === 'string' ? parseFloat(val) : Number(val);
    return Number.isFinite(n) ? Math.round(n) : 0;
  };
  const formatThousands = (v: any) => toInt(v).toLocaleString('es-CL');
  const promedioMontoPorTurno = generales.total_turnos > 0 ? toInt(generales.monto_total / generales.total_turnos) : 0;
  const ratioPendientes = generales.turnos_pendientes > 0 ? (toInt(generales.monto_pendiente) / Math.max(1, toInt(generales.turnos_pendientes))) : 0;

  return (
    <div className="space-y-5">
      {/* Indicadores de Rendimiento - Mobile First (2 col en móvil, 3 en desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Eficiencia de Pago */}
        <Card className="bg-blue-950/40 border-blue-800">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-blue-300">
              <Target className="h-4 w-4" />
              Eficiencia de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl font-bold text-blue-200">{eficienciaPago.toFixed(1)}%</div>
            <Progress value={eficienciaPago} className="mt-1 h-2" />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[11px] sm:text-xs border-blue-700 text-blue-300">
                {formatThousands(generales.turnos_pagados)} de {formatThousands(generales.total_turnos)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Promedio por Turno */}
        <Card className="bg-emerald-950/40 border-emerald-800">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-emerald-300">
              <Zap className="h-4 w-4" />
              Promedio por Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl font-bold text-emerald-200">${formatThousands(promedioMontoPorTurno)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[11px] sm:text-xs border-emerald-700 text-emerald-300">
                {generales.total_turnos} turnos
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes Críticos */}
        <Card className="bg-amber-950/40 border-amber-800">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-amber-300">
              <AlertCircle className="h-4 w-4" />
              Pendientes Críticos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl font-bold text-amber-200">{formatThousands(generales.turnos_pendientes)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[11px] sm:text-xs border-amber-700 text-amber-300">
                ${formatThousands(Math.round(ratioPendientes))} promedio
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Distribución */}
        <Card className="bg-violet-950/40 border-violet-800">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-violet-300">
              <BarChart3 className="h-4 w-4" />
              Distribución
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] sm:text-sm text-white/80">
                <span>Reemplazos</span>
                <span className="font-medium">{porcentajeReemplazos.toFixed(1)}%</span>
              </div>
              <Progress value={porcentajeReemplazos} className="h-1.5" />
              <div className="flex justify-between text-[11px] sm:text-sm text-white/80">
                <span>PPC</span>
                <span className="font-medium">{porcentajePPC.toFixed(1)}%</span>
              </div>
              <Progress value={porcentajePPC} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas Generales Mejoradas - más compactas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatThousands(generales.total_turnos)}</div>
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

        <Card className={generales.turnos_pendientes > 0 ? 'border-orange-200 bg-orange-50 dark:border-amber-800 dark:bg-amber-950/40' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-600">
              <TrendingDown className="h-4 w-4" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{formatThousands(generales.turnos_pendientes)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {porcentajePendientes.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                ${formatThousands(generales.monto_pendiente)}
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
            <div className="text-xl font-bold text-green-600">{formatThousands(generales.turnos_pagados)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {porcentajePagados.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                ${formatThousands(generales.monto_pagado)}
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
            <div className="text-xl font-bold">${formatThousands(generales.monto_total)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                ${formatThousands(Math.round(generales.promedio_por_turno))} promedio
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
            <div className="space-y-2.5">
              {estadisticas.porInstalacion.slice(0, 5).map((instalacion, index) => (
                <div key={instalacion.instalacion_nombre} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg">
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
                     <div className="font-medium">${formatThousands(instalacion.monto_total)}</div>
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
            <div className="space-y-2.5">
              {estadisticas.topGuardias.slice(0, 5).map((guardia, index) => (
                <div key={guardia.rut} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg">
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
                     <div className="font-medium">${formatThousands(guardia.monto_total)}</div>
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
            <div className="space-y-2.5">
              {estadisticas.porMes.map((mes) => (
                <div key={mes.mes} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg">
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
                     <div className="font-medium">${formatThousands(mes.monto_total)}</div>
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