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
    <div className="grid grid-cols-5 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
      {kpis.map((kpi, index) => {
        const isActive = filtroActivo === kpi.tipo;
        return (
          <Card 
            key={index} 
            className={`${isActive ? kpi.activeBgColor : kpi.bgColor} border-0 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md`}
            onClick={() => onKPIClick(kpi.tipo)}
          >
            <CardContent className="p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                    <span className="sm:hidden">{kpi.labelShort}</span>
                    <span className="hidden sm:inline">{kpi.label}</span>
                  </p>
                  <p className={`text-lg sm:text-2xl font-bold ${kpi.color}`}>
                    {kpi.value.toLocaleString('es-CL')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                    {kpi.description}
                  </p>
                </div>
                <kpi.icon className={`h-4 w-4 sm:h-8 sm:w-8 ${kpi.color} opacity-50 hidden sm:block`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
