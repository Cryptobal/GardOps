'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, Users, Building } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface TurnoExtra {
  id: string;
  guardia_id: string;
  guardia_nombre: string;
  guardia_apellido_paterno: string;
  guardia_apellido_materno: string;
  guardia_rut: string;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_id: string;
  nombre_puesto: string;
  fecha: string;
  estado: 'reemplazo' | 'ppc';
  valor: number | string;
  pagado: boolean;
  fecha_pago: string | null;
  observaciones_pago: string | null;
  usuario_pago: string | null;
  planilla_id: number | null;
  created_at: string;
}

interface CalendarViewProps {
  turnosExtras: TurnoExtra[];
  onDayClick?: (date: Date) => void;
}

// Función para formatear números con puntos como separadores de miles sin decimales
const formatCurrency = (amount: number | string): string => {
  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export default function CalendarView({ turnosExtras, onDayClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Obtener el primer día del mes actual
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  
  // Obtener todos los días del mes
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });

  // Agrupar turnos por fecha
  const turnosPorFecha = turnosExtras.reduce((acc, turno) => {
    const fecha = turno.fecha.split('T')[0];
    if (!acc[fecha]) {
      acc[fecha] = [];
    }
    acc[fecha].push(turno);
    return acc;
  }, {} as Record<string, TurnoExtra[]>);

  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (onDayClick) {
      onDayClick(date);
    }
  };

  const getTurnosForDate = (date: Date) => {
    const fechaString = format(date, 'yyyy-MM-dd');
    return turnosPorFecha[fechaString] || [];
  };

  const getDayStats = (date: Date) => {
    const turnos = getTurnosForDate(date);
    const total = turnos.length;
    const pagados = turnos.filter(t => t.pagado).length;
    const pendientes = turnos.filter(t => !t.pagado && t.planilla_id).length;
    const noPagados = turnos.filter(t => !t.pagado && !t.planilla_id).length;
    const montoTotal = turnos.reduce((sum, t) => sum + Number(t.valor), 0);

    return { total, pagados, pendientes, noPagados, montoTotal };
  };

  const getDayClassName = (date: Date) => {
    const stats = getDayStats(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);
    
    let className = 'p-2 text-center border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors';
    
    if (isSelected) {
      className += ' bg-blue-100 border-blue-300';
    } else if (isCurrentDay) {
      className += ' bg-yellow-50 border-yellow-300';
    }
    
    if (stats.total > 0) {
      if (stats.noPagados > 0) {
        className += ' bg-red-50 border-red-200';
      } else if (stats.pendientes > 0) {
        className += ' bg-orange-50 border-orange-200';
      } else {
        className += ' bg-green-50 border-green-200';
      }
    }
    
    return className;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vista de Calendario
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>Todos pagados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
            <span>Pendientes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span>No pagados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span>Hoy</span>
          </div>
        </div>

        {/* Calendario */}
        <div className="grid grid-cols-7 gap-1">
          {/* Días de la semana */}
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
              {day}
            </div>
          ))}
          
          {/* Días del mes */}
          {daysInMonth.map(date => {
            const stats = getDayStats(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            
            return (
              <div
                key={date.toISOString()}
                className={`${getDayClassName(date)} ${!isCurrentMonth ? 'text-gray-400' : ''}`}
                onClick={() => handleDayClick(date)}
              >
                <div className="text-sm font-medium mb-1">
                  {format(date, 'd')}
                </div>
                {stats.total > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium">
                      {stats.total} turno{stats.total !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatCurrency(stats.montoTotal)}
                    </div>
                    {stats.noPagados > 0 && (
                      <Badge variant="destructive" className="text-xs px-1 py-0">
                        {stats.noPagados}
                      </Badge>
                    )}
                    {stats.pendientes > 0 && stats.noPagados === 0 && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {stats.pendientes}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detalles del día seleccionado */}
        {selectedDate && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">
              Detalles del {format(selectedDate, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })}
            </h3>
            {(() => {
              const turnos = getTurnosForDate(selectedDate);
              const stats = getDayStats(selectedDate);
              
              if (turnos.length === 0) {
                return (
                  <p className="text-gray-500">No hay turnos extras para este día.</p>
                );
              }
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Total: {stats.total}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Monto: {formatCurrency(stats.montoTotal)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {turnos.map(turno => (
                      <div key={turno.id} className="p-3 bg-white rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">
                            {turno.guardia_nombre} {turno.guardia_apellido_paterno}
                          </div>
                          <Badge variant={turno.pagado ? 'default' : turno.planilla_id ? 'secondary' : 'destructive'}>
                            {turno.pagado ? 'Pagado' : turno.planilla_id ? 'Pendiente' : 'No pagado'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3" />
                            <span>{turno.instalacion_nombre}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3" />
                            <span>{formatCurrency(turno.valor)}</span>
                          </div>
                          <div className="text-xs">
                            {turno.estado.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 