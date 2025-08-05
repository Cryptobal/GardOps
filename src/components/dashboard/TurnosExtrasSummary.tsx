'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, AlertTriangle, Calendar, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TurnosExtrasStats {
  total: number;
  pendientes: number;
  pagados: number;
  montoTotal: number;
  montoPendiente: number;
  montoEsteMes: number;
}

export default function TurnosExtrasSummary() {
  const [stats, setStats] = useState<TurnosExtrasStats>({
    total: 0,
    pendientes: 0,
    pagados: 0,
    montoTotal: 0,
    montoPendiente: 0,
    montoEsteMes: 0
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra?solo_pagados=false');
      const data = await response.json();

      if (response.ok) {
        const turnos = data.turnos_extras || [];
        const total = turnos.length;
        const pendientes = turnos.filter((t: any) => !t.pagado).length;
        const pagados = turnos.filter((t: any) => t.pagado).length;
        const montoTotal = turnos.reduce((sum: number, t: any) => sum + Number(t.valor), 0);
        const montoPendiente = turnos.filter((t: any) => !t.pagado).reduce((sum: number, t: any) => sum + Number(t.valor), 0);
        
        // Calcular monto del mes actual
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const montoEsteMes = turnos
          .filter((t: any) => new Date(t.fecha) >= inicioMes)
          .reduce((sum: number, t: any) => sum + Number(t.valor), 0);

        setStats({
          total,
          pendientes,
          pagados,
          montoTotal,
          montoPendiente,
          montoEsteMes
        });
      }
    } catch (error) {
      console.error('Error cargando estadísticas de turnos extras:', error);
    } finally {
      setLoading(false);
    }
  };

  const navegarATurnosExtras = () => {
    router.push('/pauta-diaria/turnos-extras');
  };

  if (loading) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Turnos Extras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Turnos Extras
            </CardTitle>
            <CardDescription>
              Resumen de pagos y gestión de turnos adicionales
            </CardDescription>
          </div>
          <Button 
            onClick={navegarATurnosExtras}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            Ver Detalles
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Turnos */}
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Turnos</div>
          </div>

          {/* Pendientes */}
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
            <div className="text-sm text-muted-foreground">Pendientes</div>
            {stats.pendientes > 0 && (
              <Badge variant="destructive" className="mt-1 text-xs">
                Requiere Atención
              </Badge>
            )}
          </div>

          {/* Monto Pendiente */}
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              ${stats.montoPendiente.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Monto Pendiente</div>
          </div>

          {/* Monto Este Mes */}
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${stats.montoEsteMes.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Este Mes</div>
          </div>
        </div>

        {/* Barra de progreso */}
        {stats.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Progreso de Pagos</span>
              <span>{Math.round((stats.pagados / stats.total) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stats.pagados / stats.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{stats.pagados} pagados</span>
              <span>{stats.pendientes} pendientes</span>
            </div>
          </div>
        )}

        {/* Acciones rápidas */}
        <div className="mt-4 flex gap-2">
          <Button 
            onClick={() => router.push('/pauta-diaria/turnos-extras')}
            size="sm"
            className="flex-1"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Gestionar Pagos
          </Button>
          <Button 
            onClick={() => router.push('/pauta-diaria/turnos-extras/historial')}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 