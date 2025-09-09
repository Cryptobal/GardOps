'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Building2,
  Phone,
  MessageSquare
} from 'lucide-react';

interface KPIData {
  total_turnos: number;
  en_camino: number;
  no_contesta: number;
  no_ira: number;
  llego: number;
  pendiente: number;
  retrasado: number;
  en_transito: number;
  puestos_cubiertos: number;
  puestos_sin_cobertura: number;
  puestos_ppc: number;
  turnos_dia: number;
  turnos_noche: number;
}

interface KPICardsProps {
  kpis: KPIData;
  fecha: string;
  loading?: boolean;
}

const kpiConfigs = [
  {
    key: 'en_camino',
    title: 'En Camino',
    icon: Clock,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  {
    key: 'no_contesta',
    title: 'No Contesta',
    icon: XCircle,
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  {
    key: 'no_ira',
    title: 'No Irá',
    icon: XCircle,
    color: 'bg-red-600',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300'
  },
  {
    key: 'llego',
    title: 'Llegaron',
    icon: CheckCircle,
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    key: 'pendiente',
    title: 'Pendientes',
    icon: Clock,
    color: 'bg-gray-400',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  {
    key: 'retrasado',
    title: 'Retrasados',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
];

const coberturaConfigs = [
  {
    key: 'puestos_cubiertos',
    title: 'Cubiertos',
    icon: CheckCircle,
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    key: 'puestos_sin_cobertura',
    title: 'Sin Cobertura',
    icon: XCircle,
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  {
    key: 'puestos_ppc',
    title: 'Con PPC',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
];

export function KPICards({ kpis, fecha, loading = false }: KPICardsProps) {
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calcularPorcentaje = (valor: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((valor / total) * 100);
  };

  const totalActivos = kpis.en_camino + kpis.no_contesta + kpis.no_ira + kpis.llego + kpis.retrasado + kpis.en_transito;

  return (
    <div className="space-y-6">
      {/* Header con fecha */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monitoreo en Tiempo Real</h2>
          <p className="text-gray-600">{formatearFecha(fecha)}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            Total: {kpis.total_turnos} turnos
          </Badge>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
      </div>

      {/* KPIs de Estado de Turnos */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Estado de Turnos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiConfigs.map((config) => {
            const Icon = config.icon;
            const valor = kpis[config.key as keyof KPIData] as number;
            const porcentaje = calcularPorcentaje(valor, kpis.total_turnos);
            
            return (
              <Card key={config.key} className={`${config.bgColor} ${config.borderColor} border`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">{config.title}</p>
                      <p className="text-lg font-bold text-gray-900">{valor}</p>
                      <p className="text-xs text-gray-500">{porcentaje}%</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* KPIs de Cobertura */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Cobertura de Puestos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {coberturaConfigs.map((config) => {
            const Icon = config.icon;
            const valor = kpis[config.key as keyof KPIData] as number;
            const porcentaje = calcularPorcentaje(valor, kpis.total_turnos);
            
            return (
              <Card key={config.key} className={`${config.bgColor} ${config.borderColor} border`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{config.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{valor}</p>
                      <p className="text-sm text-gray-500">{porcentaje}% del total</p>
                    </div>
                    <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Resumen de Turnos por Tipo */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Distribución por Turno
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">☀️ Turnos de Día</p>
                  <p className="text-2xl font-bold text-amber-800">{kpis.turnos_dia}</p>
                  <p className="text-sm text-amber-600">
                    {calcularPorcentaje(kpis.turnos_dia, kpis.total_turnos)}% del total
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">🌙 Turnos de Noche</p>
                  <p className="text-2xl font-bold text-blue-800">{kpis.turnos_noche}</p>
                  <p className="text-sm text-blue-600">
                    {calcularPorcentaje(kpis.turnos_noche, kpis.total_turnos)}% del total
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Indicadores de Acción */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Indicadores de Acción</h3>
        <div className="flex flex-wrap gap-2">
          {kpis.no_contesta > 0 && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ {kpis.no_contesta} sin contestar
            </Badge>
          )}
          {kpis.no_ira > 0 && (
            <Badge variant="destructive" className="text-xs">
              🚨 {kpis.no_ira} no asistirán
            </Badge>
          )}
          {kpis.retrasado > 0 && (
            <Badge variant="secondary" className="text-xs">
              ⏰ {kpis.retrasado} retrasados
            </Badge>
          )}
          {kpis.puestos_sin_cobertura > 0 && (
            <Badge variant="destructive" className="text-xs">
              ❌ {kpis.puestos_sin_cobertura} sin cobertura
            </Badge>
          )}
          {kpis.llego > 0 && (
            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
              ✅ {kpis.llego} llegaron
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
