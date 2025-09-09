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
    <div className="space-y-4">
      {/* Estadísticas Principales - Mobile First */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {/* Total Turnos */}
        <Card 
          className={`bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('total')}
          title={onCardClick ? "Hacer clic para mostrar todos los turnos" : undefined}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center space-y-1">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
              <p className="text-xs font-medium text-gray-100">Total</p>
              <p className="text-sm sm:text-lg font-bold text-white">
                {formatThousands(estadisticas.total)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">
                {estadisticas.turnosEsteMes ? `Este mes` : 'Total registrados'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* No Pagados */}
        <Card 
          className={`${estadisticas.noPagados > 0 ? 'bg-rose-900/40 border-rose-500/60 hover:bg-rose-900/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'} transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('noPagados')}
          title={onCardClick ? "Hacer clic para mostrar turnos no pagados" : undefined}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center space-y-1">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-rose-400" />
              <p className="text-xs font-medium text-gray-100">No Pag.</p>
              <p className="text-sm sm:text-lg font-bold text-rose-200">
                {formatThousands(estadisticas.noPagados)}
              </p>
              <div className="hidden sm:flex flex-col gap-1">
                <Badge variant="outline" className="text-xs border-rose-400/50 text-rose-300 font-medium">
                  {porcentajeNoPagados}%
                </Badge>
                <span className="text-xs text-gray-400 font-medium">
                  {formatCurrency(estadisticas.montoNoPagado)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card 
          className={`${estadisticas.pendientes > 0 ? 'bg-amber-950/40 border-amber-800 hover:bg-amber-950/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'} transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('pendientes')}
          title={onCardClick ? "Hacer clic para mostrar turnos pendientes" : undefined}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center space-y-1">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-300" />
              <p className="text-xs font-medium text-gray-100">Pend.</p>
              <p className="text-sm sm:text-lg font-bold text-amber-100">
                {formatThousands(estadisticas.pendientes)}
              </p>
              <div className="hidden sm:flex flex-col gap-1">
                <Badge variant="outline" className="text-xs border-amber-300/50 text-amber-200 font-medium">
                  {porcentajePendientes}%
                </Badge>
                <span className="text-xs text-gray-400 font-medium">
                  {formatCurrency(estadisticas.montoPendiente)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagados */}
        <Card 
          className={`bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('pagados')}
          title={onCardClick ? "Hacer clic para mostrar turnos pagados" : undefined}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center space-y-1">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
              <p className="text-xs font-medium text-gray-100">Pag.</p>
              <p className="text-sm sm:text-lg font-bold text-emerald-200">
                {formatThousands(estadisticas.pagados)}
              </p>
              <div className="hidden sm:flex flex-col gap-1">
                <Badge variant="outline" className="text-xs border-emerald-400/50 text-emerald-300 font-medium">
                  {porcentajePagados}%
                </Badge>
                <span className="text-xs text-gray-400 font-medium">
                  {formatCurrency(estadisticas.montoPagado)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monto Total */}
        <Card 
          className={`bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 transition-all duration-200 ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
          onClick={() => handleCardClick('montoTotal')}
          title={onCardClick ? "Hacer clic para mostrar todos los turnos" : undefined}
        >
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col items-center text-center space-y-1">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
              <p className="text-xs font-medium text-gray-100">Total $</p>
              <p className="text-sm sm:text-lg font-bold text-white">
                {formatCurrency(estadisticas.montoTotal)}
              </p>
              <div className="hidden sm:flex flex-col gap-1">
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 font-medium">
                  {formatCurrency(estadisticas.promedioPorTurno || 0)} promedio
                </Badge>
                {estadisticas.montoEsteMes ? (
                  <span className="text-xs text-gray-400 font-medium">
                    {formatCurrency(estadisticas.montoEsteMes)} este mes
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">
                    Total acumulado
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 