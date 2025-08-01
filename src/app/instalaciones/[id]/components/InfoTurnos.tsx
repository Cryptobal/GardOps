'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface InfoTurnosProps {
  totalPuestos: number;
  puestosAsignados: number;
  puestosPendientes: number;
}

export default function InfoTurnos({ 
  totalPuestos, 
  puestosAsignados, 
  puestosPendientes 
}: InfoTurnosProps) {
  const porcentajeCompletado = totalPuestos > 0 ? Math.round((puestosAsignados / totalPuestos) * 100) : 0;
  const estadoGeneral = puestosPendientes === 0 ? 'completo' : puestosAsignados > 0 ? 'parcial' : 'pendiente';

  return (
    <Card className="border-0 bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Estado General */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${
                estadoGeneral === 'completo' ? 'bg-green-500' : 
                estadoGeneral === 'parcial' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium text-slate-300">
                {estadoGeneral === 'completo' ? 'Completo' : 
                 estadoGeneral === 'parcial' ? 'Parcial' : 'Pendiente'}
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {porcentajeCompletado}%
            </div>
            <div className="text-xs text-slate-400">Completado</div>
          </div>

          {/* Total Puestos */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{totalPuestos}</div>
              <div className="text-xs text-slate-400">Total Puestos</div>
            </div>
          </div>

          {/* Puestos Asignados */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-green-400">{puestosAsignados}</div>
              <div className="text-xs text-slate-400">Asignados</div>
            </div>
          </div>

          {/* Puestos Pendientes */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-red-400">{puestosPendientes}</div>
              <div className="text-xs text-slate-400">Pendientes</div>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        {totalPuestos > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progreso de asignación</span>
              <span>{puestosAsignados}/{totalPuestos}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${porcentajeCompletado}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 