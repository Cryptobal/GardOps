'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User } from 'lucide-react';

interface HistorialItem {
  id: string;
  dia: number;
  estado: string;
  observaciones?: string;
  reemplazo_guardia_id?: string;
  nombre_puesto: string;
  es_ppc: boolean;
  instalacion_nombre: string;
  reemplazo_nombre?: string;
  reemplazo_apellido_paterno?: string;
  reemplazo_apellido_materno?: string;
}

interface HistorialMensualProps {
  guardiaId: string;
}

export default function HistorialMensual({ guardiaId }: HistorialMensualProps) {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  const años = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const getEstadoBadge = (estado: string) => {
    const config = {
      trabajado: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Trabajado' },
      turno: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Turno' },
      inasistencia: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Inasistencia' },
      reemplazo: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Reemplazo' },
      licencia: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Licencia' },
      permiso: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Permiso' },
      libre: { color: 'bg-white text-gray-600 border-gray-200', label: 'Libre' },
      vacaciones: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Vacaciones' },
      T: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Turno' }
    };

    const configEstado = config[estado as keyof typeof config] || config.T;
    
    return (
      <Badge className={`${configEstado.color} border`}>
        {configEstado.label}
      </Badge>
    );
  };

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/guardias/${guardiaId}/historial-mensual?mes=${mes}&anio=${anio}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar historial');
      }

      const data = await response.json();
      
      if (data.success) {
        setHistorial(data.historial);
        console.log("✅ Historial mensual cargado correctamente para el guardia");
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, [guardiaId, mes, anio]);

  const handleMesChange = (value: string) => {
    setMes(parseInt(value));
  };

  const handleAnioChange = (value: string) => {
    setAnio(parseInt(value));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <span className="ml-2">Cargando historial...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">❌ Error al cargar historial</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historial Mensual
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Selectores de mes y año */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 mb-2 block">Mes</label>
            <Select value={mes.toString()} onValueChange={handleMesChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((mesOption) => (
                  <SelectItem key={mesOption.value} value={mesOption.value.toString()}>
                    {mesOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 mb-2 block">Año</label>
            <Select value={anio.toString()} onValueChange={handleAnioChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {años.map((año) => (
                  <SelectItem key={año} value={año.toString()}>
                    {año}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla de historial */}
        {historial.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">⚠️ No hay registros de asistencia para este guardia en este mes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Día</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Puesto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Instalación</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Observación</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Reemplazo</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.dia}</span>
                        {item.es_ppc && (
                          <Badge variant="outline" className="text-xs">
                            PPC
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getEstadoBadge(item.estado)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{item.nombre_puesto}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{item.instalacion_nombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.observaciones ? (
                        <span className="text-sm text-gray-600">{item.observaciones}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.reemplazo_guardia_id ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {item.reemplazo_nombre} {item.reemplazo_apellido_paterno} {item.reemplazo_apellido_materno || ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Resumen */}
        {historial.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Resumen del mes</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total días:</span>
                <span className="ml-2 font-medium">{historial.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Trabajados:</span>
                <span className="ml-2 font-medium text-green-600">
                  {historial.filter(h => h.estado === 'trabajado' || h.estado === 'T').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Reemplazos:</span>
                <span className="ml-2 font-medium text-yellow-600">
                  {historial.filter(h => h.estado === 'reemplazo').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Otros:</span>
                <span className="ml-2 font-medium text-gray-600">
                  {historial.filter(h => !['trabajado', 'T', 'reemplazo'].includes(h.estado)).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

