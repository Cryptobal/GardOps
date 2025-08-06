'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, AlertTriangle, Clock, CheckCircle, BarChart3, Target, Zap } from 'lucide-react';

interface StatsCardsProps {
  estadisticas: {
    total: number;
    noPagados: number;
    pendientes: number;
    pagados: number;
    montoTotal: number;
    montoNoPagado: number;
    montoPendiente: number;
    montoPagado: number;
    promedioPorTurno?: number;
    turnosEsteMes?: number;
    montoEsteMes?: number;
  };
  onCardClick?: (filterType: 'total' | 'noPagados' | 'pendientes' | 'pagados' | 'montoTotal') => void;
}

// Función para formatear números con puntos como separadores de miles sin decimales
const formatCurrency = (amount: number | string): string => {
  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export default function StatsCards({ estadisticas, onCardClick }: StatsCardsProps) {
  const porcentajeNoPagados = estadisticas.total > 0 ? (estadisticas.noPagados / estadisticas.total) * 100 : 0;
  const porcentajePendientes = estadisticas.total > 0 ? (estadisticas.pendientes / estadisticas.total) * 100 : 0;
  const porcentajePagados = estadisticas.total > 0 ? (estadisticas.pagados / estadisticas.total) * 100 : 0;

  const handleCardClick = (filterType: 'total' | 'noPagados' | 'pendientes' | 'pagados' | 'montoTotal') => {
    if (onCardClick) {
      onCardClick(filterType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Turnos */}
        <Card 
          className={`bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('total')}
          title={onCardClick ? "Hacer clic para mostrar todos los turnos" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-100">
              <Calendar className="h-4 w-4 text-blue-400" />
              Total Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{estadisticas.total}</div>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              {estadisticas.turnosEsteMes ? `Este mes` : 'Total registrados'}
            </p>
          </CardContent>
        </Card>

        {/* No Pagados */}
        <Card 
          className={`${estadisticas.noPagados > 0 ? 'bg-red-900/30 border-red-600/50 hover:bg-red-800/40 hover:border-red-500' : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600'} transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('noPagados')}
          title={onCardClick ? "Hacer clic para mostrar turnos no pagados" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-100">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              No Pagados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{estadisticas.noPagados}</div>
            <div className="flex flex-col gap-1 mt-2">
              <Badge variant="outline" className="text-sm border-red-600/50 text-red-400 font-medium">
                {porcentajeNoPagados.toFixed(1)}% de los turnos
              </Badge>
              <span className="text-sm text-gray-400 font-medium">
                {formatCurrency(estadisticas.montoNoPagado)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card 
          className={`${estadisticas.pendientes > 0 ? 'bg-orange-900/30 border-orange-600/50 hover:bg-orange-800/40 hover:border-orange-500' : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600'} transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('pendientes')}
          title={onCardClick ? "Hacer clic para mostrar turnos pendientes" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-100">
              <Clock className="h-4 w-4 text-orange-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{estadisticas.pendientes}</div>
            <div className="flex flex-col gap-1 mt-2">
              <Badge variant="outline" className="text-sm border-orange-600/50 text-orange-400 font-medium">
                {porcentajePendientes.toFixed(1)}% de los turnos
              </Badge>
              <span className="text-sm text-gray-400 font-medium">
                {formatCurrency(estadisticas.montoPendiente)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pagados */}
        <Card 
          className={`bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('pagados')}
          title={onCardClick ? "Hacer clic para mostrar turnos pagados" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-100">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Pagados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{estadisticas.pagados}</div>
            <div className="flex flex-col gap-1 mt-2">
              <Badge variant="outline" className="text-sm border-green-600/50 text-green-400 font-medium">
                {porcentajePagados.toFixed(1)}% de los turnos
              </Badge>
              <span className="text-sm text-gray-400 font-medium">
                {formatCurrency(estadisticas.montoPagado)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Monto Total */}
        <Card 
          className={`bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('montoTotal')}
          title={onCardClick ? "Hacer clic para mostrar todos los turnos" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-100">
              <DollarSign className="h-4 w-4 text-yellow-400" />
              Monto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(estadisticas.montoTotal)}</div>
            <div className="flex flex-col gap-1 mt-2">
              <Badge variant="outline" className="text-sm border-gray-600 text-gray-300 font-medium">
                {formatCurrency(estadisticas.promedioPorTurno || 0)} promedio
              </Badge>
              {estadisticas.montoEsteMes ? (
                <span className="text-sm text-gray-400 font-medium">
                  {formatCurrency(estadisticas.montoEsteMes)} este mes
                </span>
              ) : (
                <span className="text-sm text-gray-400 font-medium">
                  Total acumulado
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 