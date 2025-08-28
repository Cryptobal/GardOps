"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ResumenDias {
  diasTrabajados: number;
  diasPlanificados: number;
  diasAusencia: number;
  diasLibre: number;
  diasPermiso: number;
  diasLicencia: number;
  diasVacaciones: number;
  totalDias: number;
  // Nuevos campos para cálculo de sueldo
  diasPagables: number; // Días que se pagan (trabajados + vacaciones + permisos con goce)
  diasNoPagables: number; // Días que no se pagan (libres + licencias + permisos sin goce)
  diasDescontables: number; // Días que se descuentan (inasistencias)
}

interface ResumenDiasGuardiaProps {
  guardiaId: string;
}

export default function ResumenDiasGuardia({ guardiaId }: ResumenDiasGuardiaProps) {
  const [resumen, setResumen] = useState<ResumenDias | null>(null);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    cargarResumenDias();
  }, [guardiaId, mes, anio]);

  const cargarResumenDias = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guardias/${guardiaId}/resumen-dias?mes=${mes}&anio=${anio}`);
      if (!response.ok) throw new Error('Error al cargar resumen de días');
      
      const data = await response.json();
      setResumen(data.data.resumen);
    } catch (error) {
      console.error('Error cargando resumen de días:', error);
      setResumen(null);
    } finally {
      setLoading(false);
    }
  };

  const getNombreMes = (mes: number): string => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1];
  };

  const calcularPorcentaje = (valor: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((valor / total) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Resumen de Días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Cargando resumen...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Resumen de Días - {getNombreMes(mes)} {anio}
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {getNombreMes(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anio.toString()} onValueChange={(value) => setAnio(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((a) => (
                <SelectItem key={a} value={a.toString()}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {resumen ? (
          <div className="space-y-6">
            {/* Resumen general */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg border">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-semibold text-green-700">{resumen.diasTrabajados}</div>
                <div className="text-xs text-green-600">Trabajados</div>
                <div className="text-xs text-gray-500">
                  {calcularPorcentaje(resumen.diasTrabajados, resumen.totalDias)}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg border">
                <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-semibold text-blue-700">{resumen.diasPlanificados}</div>
                <div className="text-xs text-blue-600">Planificados</div>
                <div className="text-xs text-gray-500">
                  {calcularPorcentaje(resumen.diasPlanificados, resumen.totalDias)}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg border">
                <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <div className="text-lg font-semibold text-red-700">{resumen.diasAusencia}</div>
                <div className="text-xs text-red-600">Ausencias</div>
                <div className="text-xs text-gray-500">
                  {calcularPorcentaje(resumen.diasAusencia, resumen.totalDias)}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg border">
                <Calendar className="h-6 w-6 text-gray-600 mx-auto mb-1" />
                <div className="text-lg font-semibold text-gray-700">{resumen.totalDias}</div>
                <div className="text-xs text-gray-600">Total</div>
                <div className="text-xs text-gray-500">100%</div>
              </div>
            </div>

            {/* Detalle de otros días */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm font-medium">Libres</span>
                </div>
                <span className="text-sm font-semibold">{resumen.diasLibre}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span className="text-sm font-medium">Permisos</span>
                </div>
                <span className="text-sm font-semibold">{resumen.diasPermiso}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span className="text-sm font-medium">Licencias</span>
                </div>
                <span className="text-sm font-semibold">{resumen.diasLicencia}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                  <span className="text-sm font-medium">Vacaciones</span>
                </div>
                <span className="text-sm font-semibold">{resumen.diasVacaciones}</span>
              </div>
            </div>

            {/* Estadísticas adicionales */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Estadísticas del Período</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Días efectivos:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {resumen.diasTrabajados + resumen.diasPlanificados}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Tasa asistencia:</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {calcularPorcentaje(resumen.diasTrabajados, resumen.totalDias)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Tasa ausencia:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {calcularPorcentaje(resumen.diasAusencia, resumen.totalDias)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Días no laborales:</span>
                  <span className="ml-2 font-medium text-gray-600">
                    {resumen.diasLibre + resumen.diasPermiso + resumen.diasLicencia + resumen.diasVacaciones}
                  </span>
                </div>
              </div>
            </div>

            {/* Información para cálculo de sueldo */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Información para Cálculo de Sueldo</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-50 rounded-lg border">
                  <div className="font-medium text-green-700">Días Pagables</div>
                  <div className="text-lg font-bold text-green-800">{resumen.diasPagables}</div>
                  <div className="text-xs text-green-600">
                    Trabajados + Vacaciones + Permisos con Goce
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border">
                  <div className="font-medium text-yellow-700">Días No Pagables</div>
                  <div className="text-lg font-bold text-yellow-800">{resumen.diasNoPagables}</div>
                  <div className="text-xs text-yellow-600">
                    Libres + Licencias + Permisos sin Goce + Planificados
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border">
                  <div className="font-medium text-red-700">Días Descontables</div>
                  <div className="text-lg font-bold text-red-800">{resumen.diasDescontables}</div>
                  <div className="text-xs text-red-600">
                    Inasistencias (se descuentan del sueldo)
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay datos disponibles para este período</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
