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
      {/* Estadísticas Principales - Mobile First Premium */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Turnos */}
        <Card 
          className={`bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/40 dark:hover:to-blue-800/30 transition-all duration-300 ${onCardClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}`}
          onClick={() => handleCardClick('total')}
          title={onCardClick ? "Hacer clic para mostrar todos los turnos" : undefined}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100">Total</p>
              <p className="text-lg sm:text-xl font-bold text-blue-800 dark:text-blue-200">
                {formatThousands(estadisticas.total)}
              </p>
              <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hidden sm:block font-medium">
                {estadisticas.turnosEsteMes ? `Este mes` : 'Total registrados'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* No Pagados */}
        <Card 
          className={`${estadisticas.noPagados > 0 
            ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-700 hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/40 dark:hover:to-red-800/30' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/20 border-gray-200 dark:border-gray-700 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-800/40 dark:hover:to-gray-700/30'
          } transition-all duration-300 ${onCardClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}`}
          onClick={() => handleCardClick('noPagados')}
          title={onCardClick ? "Hacer clic para mostrar turnos no pagados" : undefined}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md ${
                estadisticas.noPagados > 0 ? 'bg-red-500' : 'bg-gray-500'
              }`}>
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-red-900 dark:text-red-100">No Pag.</p>
              <p className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-200">
                {formatThousands(estadisticas.noPagados)}
              </p>
              <div className="hidden sm:flex flex-col gap-1">
                <Badge variant="outline" className="text-xs border-red-400/50 text-red-700 dark:text-red-300 font-semibold bg-red-50 dark:bg-red-900/20">
                  {porcentajeNoPagados}%
                </Badge>
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {formatCurrency(estadisticas.montoNoPagado)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card 
          className={`${estadisticas.pendientes > 0 
            ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-orange-200 dark:border-orange-700 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/40 dark:hover:to-orange-800/30' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/20 border-gray-200 dark:border-gray-700 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-800/40 dark:hover:to-gray-700/30'
          } transition-all duration-300 ${onCardClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}`}
          onClick={() => handleCardClick('pendientes')}
          title={onCardClick ? "Hacer clic para mostrar turnos pendientes" : undefined}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md ${
                estadisticas.pendientes > 0 ? 'bg-orange-500' : 'bg-gray-500'
              }`}>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-orange-900 dark:text-orange-100">Pend.</p>
              <p className="text-lg sm:text-xl font-bold text-orange-800 dark:text-orange-200">
                {formatThousands(estadisticas.pendientes)}
              </p>
              <div className="hidden sm:flex flex-col gap-1">
                <Badge variant="outline" className="text-xs border-orange-400/50 text-orange-700 dark:text-orange-300 font-semibold bg-orange-50 dark:bg-orange-900/20">
                  {porcentajePendientes}%
                </Badge>
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  {formatCurrency(estadisticas.montoPendiente)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagados */}
        <Card 
          className={`bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-700 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/40 dark:hover:to-green-800/30 transition-all duration-300 ${onCardClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}`}
          onClick={() => handleCardClick('pagados')}
          title={onCardClick ? "Hacer clic para mostrar turnos pagados" : undefined}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-green-900 dark:text-green-100">Pag.</p>
              <p className="text-lg sm:text-xl font-bold text-green-800 dark:text-green-200">
                {formatThousands(estadisticas.pagados)}
              </p>
              <div className="hidden sm:flex flex-col gap-1">
                <Badge variant="outline" className="text-xs border-green-400/50 text-green-700 dark:text-green-300 font-semibold bg-green-50 dark:bg-green-900/20">
                  {porcentajePagados}%
                </Badge>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {formatCurrency(estadisticas.montoPagado)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monto Total */}
        <Card 
          className={`bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700 hover:from-yellow-100 hover:to-yellow-200 dark:hover:from-yellow-900/40 dark:hover:to-yellow-800/30 transition-all duration-300 ${onCardClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}`}
          onClick={() => handleCardClick('montoTotal')}
          title={onCardClick ? "Hacer clic para mostrar todos los turnos" : undefined}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-yellow-900 dark:text-yellow-100">Total $</p>
              <p className="text-lg sm:text-xl font-bold text-yellow-800 dark:text-yellow-200">
                {formatCurrency(estadisticas.montoTotal)}
              </p>
              <div className="hidden sm:flex flex-col gap-1">
                <Badge variant="outline" className="text-xs border-yellow-400/50 text-yellow-700 dark:text-yellow-300 font-semibold bg-yellow-50 dark:bg-yellow-900/20">
                  {formatCurrency(estadisticas.promedioPorTurno || 0)} promedio
                </Badge>
                {estadisticas.montoEsteMes ? (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                    {formatCurrency(estadisticas.montoEsteMes)} este mes
                  </span>
                ) : (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
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