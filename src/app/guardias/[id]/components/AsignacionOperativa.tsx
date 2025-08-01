'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Clock, MapPin, User } from 'lucide-react';

interface AsignacionActual {
  id: string;
  instalacion: string;
  instalacion_id: string;
  rol: string;
  jornada: string;
  ppc_id: string;
  fecha_asignacion: string;
}

interface HistorialAsignacion {
  id: string;
  instalacion: string;
  rol: string;
  fecha_asignacion: string;
  fecha_termino?: string;
  estado: string;
  tipo: string;
  ppc_id?: string;
}

interface PPCPendiente {
  id: string;
  instalacion: string;
  instalacion_id: string;
  rol: string;
  jornada: string;
  faltantes: number;
  creado: string;
}

interface AsignacionData {
  tieneAsignacion: boolean;
  asignacionActual: AsignacionActual | null;
  historial: HistorialAsignacion[];
}

interface AsignacionOperativaProps {
  guardiaId: string;
}

export default function AsignacionOperativa({ guardiaId }: AsignacionOperativaProps) {
  const [asignacionData, setAsignacionData] = useState<AsignacionData | null>(null);
  const [ppcsPendientes, setPpcsPendientes] = useState<PPCPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [asignando, setAsignando] = useState<string | null>(null);
  const { success, error } = useToast();

  useEffect(() => {
    cargarDatos();
  }, [guardiaId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar asignación actual e historial
      const asignacionResponse = await fetch(`/api/guardias/${guardiaId}/asignacion-actual`);
      if (!asignacionResponse.ok) {
        throw new Error('Error al cargar asignación');
      }
      const asignacionData = await asignacionResponse.json();
      setAsignacionData(asignacionData);

      // Si no tiene asignación, cargar PPCs pendientes
      if (!asignacionData.tieneAsignacion) {
        const ppcsResponse = await fetch('/api/ppc/pendientes');
        if (!ppcsResponse.ok) {
          throw new Error('Error al cargar PPCs pendientes');
        }
        const ppcsData = await ppcsResponse.json();
        setPpcsPendientes(ppcsData);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      error('Error al cargar datos de asignación');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarPPC = async (ppcId: string) => {
    try {
      setAsignando(ppcId);
      
      const response = await fetch('/api/ppc/asignar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: guardiaId,
          ppc_id: ppcId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al asignar');
      }

      const result = await response.json();
      success('Guardia asignado correctamente al PPC');
      
      // Recargar datos para mostrar la nueva asignación
      await cargarDatos();
    } catch (err) {
      console.error('Error asignando PPC:', err);
      error(err instanceof Error ? err.message : 'Error al asignar PPC');
    } finally {
      setAsignando(null);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const agruparPPCsPorInstalacion = (ppcs: PPCPendiente[]) => {
    const grupos: { [key: string]: PPCPendiente[] } = {};
    ppcs.forEach(ppc => {
      if (!grupos[ppc.instalacion]) {
        grupos[ppc.instalacion] = [];
      }
      grupos[ppc.instalacion].push(ppc);
    });
    return grupos;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Asignación Operativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              <span className="ml-2">Cargando...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asignación Actual */}
      {asignacionData?.tieneAsignacion && asignacionData.asignacionActual && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Asignación Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Instalación
                  </label>
                  <p className="text-lg font-semibold">{asignacionData.asignacionActual.instalacion}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Rol de Servicio
                  </label>
                  <p className="text-lg font-semibold">{asignacionData.asignacionActual.rol}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Jornada y Horario
                  </label>
                  <p className="text-lg">{asignacionData.asignacionActual.jornada}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">ID del PPC</label>
                  <p className="text-lg font-mono">{asignacionData.asignacionActual.ppc_id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sin Asignación */}
      {!asignacionData?.tieneAsignacion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Sin Asignación Operativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">
                  Guardia sin asignación operativa. Selecciona un PPC disponible para asignar.
                </p>
              </div>
            </div>

            {/* PPCs Pendientes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">PPCs Disponibles</h3>
              {ppcsPendientes.length > 0 ? (
                Object.entries(agruparPPCsPorInstalacion(ppcsPendientes)).map(([instalacion, ppcs]) => (
                  <Card key={instalacion} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-lg">{instalacion}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {ppcs.map((ppc) => (
                          <div key={ppc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{ppc.rol}</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-600">{ppc.jornada}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Guardias faltantes: {ppc.faltantes}</span>
                                <span>•</span>
                                <span>Creado: {formatearFecha(ppc.creado)}</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAsignarPPC(ppc.id)}
                              disabled={asignando === ppc.id}
                              className="ml-4"
                            >
                              {asignando === ppc.id ? 'Asignando...' : 'Asignar Guardia'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay PPCs pendientes disponibles</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Asignaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {asignacionData?.historial && asignacionData.historial.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instalación</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de Asignación</TableHead>
                  <TableHead>Fecha de Término</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asignacionData.historial.map((asignacion) => (
                  <TableRow key={asignacion.id}>
                    <TableCell className="font-medium">{asignacion.instalacion}</TableCell>
                    <TableCell>{asignacion.rol}</TableCell>
                    <TableCell>{formatearFecha(asignacion.fecha_asignacion)}</TableCell>
                    <TableCell>
                      {asignacion.fecha_termino ? formatearFecha(asignacion.fecha_termino) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        asignacion.estado === 'Activa' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {asignacion.estado}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{asignacion.tipo}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay historial de asignaciones</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 