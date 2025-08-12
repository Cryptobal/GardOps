'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, AlertTriangle, Clock, CheckCircle, BarChart3, Target, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

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

// Formateo consistente: miles con punto y sin decimales
const formatThousands = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const intVal = Number.isFinite(num) ? Math.round(num) : 0;
  return intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatCurrency = (amount: number | string): string => `$ ${formatThousands(amount)}`;

export default function StatsCards({ estadisticas, onCardClick }: StatsCardsProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const porcentajeNoPagados = estadisticas.total > 0 ? Math.round((estadisticas.noPagados / estadisticas.total) * 100) : 0;
  const porcentajePendientes = estadisticas.total > 0 ? Math.round((estadisticas.pendientes / estadisticas.total) * 100) : 0;
  const porcentajePagados = estadisticas.total > 0 ? Math.round((estadisticas.pagados / estadisticas.total) * 100) : 0;

  const handleCardClick = (filterType: 'total' | 'noPagados' | 'pendientes' | 'pagados' | 'montoTotal') => {
    if (onCardClick) {
      onCardClick(filterType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className={`grid gap-3 sm:gap-4 ${
        isMobile 
          ? 'grid-cols-2' // En móvil: 2 columnas para mayor legibilidad
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5' // En desktop: responsive
      }`}>
        {/* Total Turnos */}
        <Card 
          className={`bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('total')}
          title={onCardClick ? "Hacer clic para mostrar todos los turnos" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`font-medium flex items-center gap-2 text-gray-100 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              <Calendar className={`text-blue-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              {isMobile ? 'Total' : 'Total Turnos'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-white ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {formatThousands(estadisticas.total)}
            </div>
            {!isMobile && (
              <p className="text-sm text-gray-400 mt-1 font-medium">
                {estadisticas.turnosEsteMes ? `Este mes` : 'Total registrados'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* No Pagados */}
        <Card 
          className={`${estadisticas.noPagados > 0 ? 'bg-rose-900/40 border-rose-500/60 hover:bg-rose-900/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'} transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('noPagados')}
          title={onCardClick ? "Hacer clic para mostrar turnos no pagados" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`font-medium flex items-center gap-2 text-gray-100 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              <AlertTriangle className={`text-rose-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              {isMobile ? 'No Pag.' : 'No Pagados'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-rose-200 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {formatThousands(estadisticas.noPagados)}
            </div>
            {!isMobile && (
              <div className="flex flex-col gap-1 mt-2">
                <Badge variant="outline" className="text-sm border-rose-400/50 text-rose-300 font-medium">
                  {porcentajeNoPagados}% de los turnos
                </Badge>
                <span className="text-sm text-gray-400 font-medium">
                  {formatCurrency(estadisticas.montoNoPagado)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card 
          className={`${estadisticas.pendientes > 0 ? 'bg-amber-950/40 border-amber-800 hover:bg-amber-950/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'} transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('pendientes')}
          title={onCardClick ? "Hacer clic para mostrar turnos pendientes" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`font-medium flex items-center gap-2 text-amber-200 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              <Clock className={`text-amber-300 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              {isMobile ? 'Pend.' : 'Pendientes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-amber-100 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {formatThousands(estadisticas.pendientes)}
            </div>
            {!isMobile && (
              <div className="flex flex-col gap-1 mt-2">
                <Badge variant="outline" className="text-sm border-amber-300/50 text-amber-200 font-medium">
                  {porcentajePendientes}% de los turnos
                </Badge>
                <span className="text-sm text-gray-400 font-medium">
                  {formatCurrency(estadisticas.montoPendiente)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagados */}
        <Card 
          className={`bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('pagados')}
          title={onCardClick ? "Hacer clic para mostrar turnos pagados" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`font-medium flex items-center gap-2 text-gray-100 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              <CheckCircle className={`text-emerald-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              {isMobile ? 'Pag.' : 'Pagados'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-emerald-200 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {formatThousands(estadisticas.pagados)}
            </div>
            {!isMobile && (
              <div className="flex flex-col gap-1 mt-2">
                <Badge variant="outline" className="text-sm border-emerald-400/50 text-emerald-300 font-medium">
                  {porcentajePagados}% de los turnos
                </Badge>
                <span className="text-sm text-gray-400 font-medium">
                  {formatCurrency(estadisticas.montoPagado)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monto Total */}
        <Card 
          className={`bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('montoTotal')}
          title={onCardClick ? "Hacer clic para mostrar todos los turnos" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`font-medium flex items-center gap-2 text-gray-100 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              <DollarSign className={`text-yellow-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              {isMobile ? 'Total $' : 'Monto Total'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-white ${isMobile ? 'text-base' : 'text-2xl'}`}>
              {formatCurrency(estadisticas.montoTotal)}
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <Badge variant="outline" className={`border-gray-600 text-gray-300 font-medium ${isMobile ? 'text-[10px]' : 'text-sm'}`}>
                {formatCurrency(estadisticas.promedioPorTurno || 0)} promedio
              </Badge>
              {estadisticas.montoEsteMes ? (
                <span className={`text-gray-400 font-medium ${isMobile ? 'text-[11px]' : 'text-sm'}`}>
                  {formatCurrency(estadisticas.montoEsteMes)} este mes
                </span>
              ) : (
                <span className={`text-gray-400 font-medium ${isMobile ? 'text-[11px]' : 'text-sm'}`}>
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