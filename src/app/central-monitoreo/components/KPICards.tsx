import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertCircle, Clock, CheckCircle, Activity, BarChart3
} from 'lucide-react';

interface KPICardsProps {
  urgentes: number;
  actuales: number;
  proximos: number;
  no_realizados: number;
  completados: number;
  total: number;
  filtroActivo: string;
  onKPIClick: (tipo: string) => void;
}

export function KPICards({ 
  urgentes, 
  actuales, 
  proximos, 
  no_realizados,
  completados, 
  total, 
  filtroActivo,
  onKPIClick 
}: KPICardsProps) {
  const kpis = [
    {
      tipo: 'actuales',
      label: '🟡 Actuales',
      labelShort: 'Act',
      value: actuales,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      activeBgColor: 'bg-yellow-200 dark:bg-yellow-800/30',
      description: 'Esta hora'
    },
    {
      tipo: 'proximos',
      label: '🔵 Próximos',
      labelShort: 'Prx',
      value: proximos,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      activeBgColor: 'bg-blue-200 dark:bg-blue-800/30',
      description: 'Resto del día'
    },
    {
      tipo: 'completados',
      label: '🟢 Completados',
      labelShort: 'Com',
      value: completados,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      activeBgColor: 'bg-green-200 dark:bg-green-800/30',
      description: 'Exitosos'
    },
    {
      tipo: 'no_realizados',
      label: '🔴 No Realizados',
      labelShort: 'NoR',
      value: no_realizados,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      activeBgColor: 'bg-red-200 dark:bg-red-800/30',
      description: 'Llamados atrasados'
    },
    {
      tipo: 'todos',
      label: '📊 Total',
      labelShort: 'Tot',
      value: total,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      activeBgColor: 'bg-purple-200 dark:bg-purple-800/30',
      description: 'Del día'
    }
  ];

  return (
    <div className="space-y-3">
      {/* KPIs principales en grid compacto */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {kpis.map((kpi, index) => {
          const isActive = filtroActivo === kpi.tipo;
          return (
            <Card 
              key={index} 
              className={`${isActive ? kpi.activeBgColor : kpi.bgColor} border-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md rounded-lg ${
                isActive ? 'ring-2 ring-blue-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => onKPIClick(kpi.tipo)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                    kpi.tipo === 'actuales' ? 'bg-yellow-500' :
                    kpi.tipo === 'proximos' ? 'bg-blue-500' :
                    kpi.tipo === 'completados' ? 'bg-green-500' :
                    kpi.tipo === 'no_realizados' ? 'bg-red-500' :
                    'bg-purple-500'
                  }`}>
                    <kpi.icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <span className="sm:hidden">{kpi.labelShort}</span>
                    <span className="hidden sm:inline">{kpi.label}</span>
                  </p>
                  <p className={`text-lg font-bold ${
                    kpi.tipo === 'actuales' ? 'text-yellow-700 dark:text-yellow-300' :
                    kpi.tipo === 'proximos' ? 'text-blue-700 dark:text-blue-300' :
                    kpi.tipo === 'completados' ? 'text-green-700 dark:text-green-300' :
                    kpi.tipo === 'no_realizados' ? 'text-red-700 dark:text-red-300' :
                    'text-purple-700 dark:text-purple-300'
                  }`}>
                    {kpi.value.toLocaleString('es-CL')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    {kpi.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
