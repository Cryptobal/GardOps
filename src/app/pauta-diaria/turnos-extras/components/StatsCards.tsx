'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, AlertTriangle } from 'lucide-react';

interface StatsCardsProps {
  estadisticas: {
    total: number;
    pendientes: number;
    pagados: number;
    montoTotal: number;
    montoPendiente: number;
    montoPagado?: number;
    promedioPorTurno?: number;
    turnosEsteMes?: number;
    montoEsteMes?: number;
  };
}

export default function StatsCards({ estadisticas }: StatsCardsProps) {
  const porcentajePendientes = estadisticas.total > 0 ? (estadisticas.pendientes / estadisticas.total) * 100 : 0;
  const porcentajePagados = estadisticas.total > 0 ? (estadisticas.pagados / estadisticas.total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Turnos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Total Turnos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{estadisticas.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {estadisticas.turnosEsteMes && `${estadisticas.turnosEsteMes} este mes`}
          </p>
        </CardContent>
      </Card>

      {/* Pendientes */}
      <Card className={estadisticas.pendientes > 0 ? 'border-orange-200 bg-orange-50' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{estadisticas.pendientes}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {porcentajePendientes.toFixed(1)}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              ${estadisticas.montoPendiente.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pagados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Pagados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{estadisticas.pagados}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {porcentajePagados.toFixed(1)}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              ${(estadisticas.montoPagado || estadisticas.montoTotal - estadisticas.montoPendiente).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Monto Total */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Monto Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${estadisticas.montoTotal.toLocaleString()}</div>
          <div className="flex items-center gap-2 mt-1">
            {estadisticas.promedioPorTurno && (
              <Badge variant="outline" className="text-xs">
                ${estadisticas.promedioPorTurno.toLocaleString()} promedio
              </Badge>
            )}
            {estadisticas.montoEsteMes && (
              <span className="text-xs text-muted-foreground">
                ${estadisticas.montoEsteMes.toLocaleString()} este mes
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 