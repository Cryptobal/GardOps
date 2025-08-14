import { Authorize, GuardButton, can } from '@/lib/authz-ui'
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Activity, Clock, User, MapPin, Settings, AlertTriangle } from 'lucide-react';

interface LogActividad {
  id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  usuario: string;
  detalles?: string;
}

interface LogGuardiaProps {
  guardiaId: string;
}

export default function LogGuardia({ guardiaId }: LogGuardiaProps) {
  const [logs, setLogs] = useState<LogActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    cargarLogs();
  }, [guardiaId]);

  const cargarLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/logs?guardia_id=${guardiaId}`);
      if (!response.ok) {
        throw new Error('Error al cargar logs');
      }
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      console.error('Error cargando logs:', err);
      error('Error al cargar historial de actividad');
    } finally {
      setLoading(false);
    }
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'asignacion':
        return <Settings className="h-4 w-4 text-blue-600" />;
      case 'ubicacion':
        return <MapPin className="h-4 w-4 text-green-600" />;
      case 'documento':
        return <Activity className="h-4 w-4 text-purple-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getColorTipo = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'asignacion':
        return 'bg-blue-100 text-blue-800';
      case 'ubicacion':
        return 'bg-green-100 text-green-800';
      case 'documento':
        return 'bg-purple-100 text-purple-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historial de Actividad
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Historial de Actividad
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {logs.length} actividad{logs.length !== 1 ? 'es' : ''} registrada{logs.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getIconoTipo(log.tipo)}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColorTipo(log.tipo)}`}>
                          {log.tipo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{log.descripcion}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {formatearFecha(log.fecha)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        {log.usuario}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.detalles ? (
                        <span className="text-sm text-gray-600">{log.detalles}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay actividad registrada para este guardia</p>
            <p className="text-sm text-gray-400 mt-2">
              Las actividades se registrarán automáticamente cuando se realicen cambios
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 