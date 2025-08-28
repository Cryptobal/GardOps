'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  Building2,
  Calendar,
  Users,
  Loader2,
  ExternalLink
} from 'lucide-react';

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
  instalacion_id: string;
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
  patron: string;
  horario: string;
  faltantes: number;
  guardias_requeridos: number;
  creado: string;
  estado: string;
}

interface InstalacionConPPC {
  id: string;
  instalacion_nombre: string;
  direccion: string;
  ciudad: string;
  comuna: string;
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
  const [instalaciones, setInstalaciones] = useState<InstalacionConPPC[]>([]);
  const [ppcsPendientes, setPpcsPendientes] = useState<PPCPendiente[]>([]);
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cargandoInstalaciones, setCargandoInstalaciones] = useState(false);
  const [cargandoPPCs, setCargandoPPCs] = useState(false);
  const [asignando, setAsignando] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, [guardiaId]);

  useEffect(() => {
    if (instalacionSeleccionada) {
      cargarPPCsDeInstalacion(instalacionSeleccionada);
    } else {
      setPpcsPendientes([]);
    }
  }, [instalacionSeleccionada]);

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

      // Cargar instalaciones con PPC activos
      await cargarInstalacionesConPPC();
    } catch (err) {
      console.error('Error cargando datos:', err);
      toast.error("Error al cargar datos de asignación");
    } finally {
      setLoading(false);
    }
  };

  const cargarInstalacionesConPPC = async () => {
    try {
      setCargandoInstalaciones(true);
      const response = await fetch('/api/instalaciones-con-ppc-activos');
      if (!response.ok) {
        throw new Error('Error al cargar instalaciones');
      }
      const data = await response.json();
      setInstalaciones(data);
    } catch (err) {
      console.error('Error cargando instalaciones:', err);
      toast.error("Error al cargar instalaciones");
    } finally {
      setCargandoInstalaciones(false);
    }
  };

  const cargarPPCsDeInstalacion = async (instalacionId: string) => {
    try {
      setCargandoPPCs(true);
      // Usar la API existente de PPC pendientes y filtrar por instalación
      const response = await fetch('/api/ppc/pendientes');
      if (!response.ok) {
        throw new Error('Error al cargar PPCs');
      }
      const allPpcs = await response.json();
      // Filtrar PPCs de la instalación seleccionada
      const ppcsDeInstalacion = allPpcs.filter((ppc: any) => ppc.instalacion_id === instalacionId);
      setPpcsPendientes(ppcsDeInstalacion);
    } catch (err) {
      console.error('Error cargando PPCs:', err);
      toast.error("Error al cargar PPCs de la instalación");
    } finally {
      setCargandoPPCs(false);
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
          puesto_operativo_id: ppcId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al asignar');
      }

      const result = await response.json();
      toast.success("Guardia asignado correctamente al puesto");
      
      // Actualizar solo los datos de asignación sin activar loading general
      const asignacionResponse = await fetch(`/api/guardias/${guardiaId}/asignacion-actual`);
      if (asignacionResponse.ok) {
        const asignacionData = await asignacionResponse.json();
        setAsignacionData(asignacionData);
      }
      
      // Limpiar selección
      setInstalacionSeleccionada('');
      setPpcsPendientes([]);
      
      console.log("Asignación operativa actualizada correctamente");
    } catch (err) {
      console.error('Error asignando PPC:', err);
      toast.error(err instanceof Error ? err.message : 'Error al asignar PPC');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100">Asignación Operativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-300">Cargando...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Layout optimizado: Asignación Activa y Cambio de PPC en la misma línea */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asignación Operativa Activa */}
        {asignacionData?.tieneAsignacion && asignacionData.asignacionActual ? (
          <Card className="bg-green-900/20 border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-100">
                    Asignación Operativa Activa
                  </h3>
                  <div className="grid grid-cols-1 gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-green-400" />
                      <div>
                        <span className="text-green-200 font-medium">Instalación:</span>
                        <Link 
                          href={`/instalaciones/${asignacionData.asignacionActual.instalacion_id}`}
                          className="text-green-100 ml-2 hover:text-green-300 hover:underline flex items-center gap-1 transition-colors"
                        >
                          {asignacionData.asignacionActual.instalacion}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-400" />
                      <div>
                        <span className="text-green-200 font-medium">Rol:</span>
                        <span className="text-green-100 ml-2">{asignacionData.asignacionActual.rol}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-green-300">
                    <span className="font-medium">Asignado desde:</span> {formatearFecha(asignacionData.asignacionActual.fecha_asignacion)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="text-lg font-semibold text-red-100">
                    ⚠️ Guardia sin asignación operativa
                  </h3>
                  <p className="text-red-200 text-sm mt-1">
                    Selecciona una instalación y PPC para asignar al guardia
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cambiar a Otro PPC - Solo mostrar si hay asignación activa */}
        {asignacionData?.tieneAsignacion && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Asignar Nuevo Puesto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mensaje informativo */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-blue-200 font-medium text-sm">Cambio de Turno</p>
                    <p className="text-blue-300 text-xs">
                      Al asignar un nuevo PPC, la asignación actual se terminará automáticamente 
                      con fecha de hoy y se creará la nueva asignación.
                    </p>
                  </div>
                </div>
              </div>

              {/* Selector de Instalación */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Seleccionar Instalación
                </label>
                <Select 
                  value={instalacionSeleccionada} 
                  onValueChange={setInstalacionSeleccionada}
                  disabled={cargandoInstalaciones}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                    <SelectValue placeholder={
                      cargandoInstalaciones 
                        ? "Cargando instalaciones..." 
                        : "Selecciona una instalación"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {instalaciones.map((instalacion) => (
                      <SelectItem 
                        key={instalacion.id} 
                        value={instalacion.id}
                        className="text-gray-100 hover:bg-gray-700"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{instalacion.instalacion_nombre}</span>
                          <span className="text-xs text-gray-400">
                            {instalacion.ciudad && instalacion.comuna 
                              ? `${instalacion.ciudad}, ${instalacion.comuna}`
                              : instalacion.ciudad || instalacion.comuna || 'Sin ubicación'
                            }
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de PPCs */}
              {instalacionSeleccionada && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-100">PPCs Disponibles</h4>
                    {cargandoPPCs && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Cargando PPCs...
                      </div>
                    )}
                  </div>
                  
                  {ppcsPendientes.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {ppcsPendientes.map((ppc) => (
                        <Card key={ppc.id} className="bg-gray-800 border-gray-700">
                          <CardContent className="pt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-blue-900/50 text-blue-200 text-xs">
                                    {ppc.rol}
                                  </Badge>
                                  <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                                    {ppc.jornada}
                                  </Badge>
                                </div>
                                
                                <div className="text-xs text-gray-300">
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-400">Patrón:</span>
                                    <span>{ppc.patron}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-400">Horario:</span>
                                    <span>{ppc.horario}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{ppc.faltantes} de {ppc.guardias_requeridos} cupos</span>
                                  </div>
                                </div>
                              </div>
                              
                              <Button
                                onClick={() => handleAsignarPPC(ppc.id)}
                                disabled={asignando === ppc.id || ppc.faltantes === 0}
                                size="sm"
                                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {asignando === ppc.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Asignando...
                                  </>
                                ) : (
                                  'Asignar'
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : !cargandoPPCs ? (
                    <div className="text-center py-4 text-gray-400">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No hay PPCs activos en esta instalación</p>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selector de Instalaciones y PPCs para guardias sin asignación */}
      {!asignacionData?.tieneAsignacion && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Asignar a PPC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selector de Instalación */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Seleccionar Instalación
              </label>
              <Select 
                value={instalacionSeleccionada} 
                onValueChange={setInstalacionSeleccionada}
                disabled={cargandoInstalaciones}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                  <SelectValue placeholder={
                    cargandoInstalaciones 
                      ? "Cargando instalaciones..." 
                      : "Selecciona una instalación"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {instalaciones.map((instalacion) => (
                    <SelectItem 
                      key={instalacion.id} 
                      value={instalacion.id}
                      className="text-gray-100 hover:bg-gray-700"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{instalacion.instalacion_nombre}</span>
                        <span className="text-xs text-gray-400">
                          {instalacion.ciudad && instalacion.comuna 
                            ? `${instalacion.ciudad}, ${instalacion.comuna}`
                            : instalacion.ciudad || instalacion.comuna || 'Sin ubicación'
                          }
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de PPCs */}
            {instalacionSeleccionada && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold text-gray-100">PPCs Disponibles</h4>
                  {cargandoPPCs && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando PPCs...
                    </div>
                  )}
                </div>
                
                {ppcsPendientes.length > 0 ? (
                  <div className="space-y-3">
                    {ppcsPendientes.map((ppc) => (
                      <Card key={ppc.id} className="bg-gray-800 border-gray-700">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-blue-900/50 text-blue-200">
                                  {ppc.rol}
                                </Badge>
                                <Badge variant="outline" className="border-gray-600 text-gray-300">
                                  {ppc.jornada}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Patrón:</span>
                                  <span>{ppc.patron}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Horario:</span>
                                  <span>{ppc.horario}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span>{ppc.faltantes} de {ppc.guardias_requeridos} cupos</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Calendar className="h-3 w-3" />
                                <span>Creado: {formatearFecha(ppc.creado)}</span>
                              </div>
                            </div>
                            
                            <Button
                              onClick={() => handleAsignarPPC(ppc.id)}
                              disabled={asignando === ppc.id || ppc.faltantes === 0}
                              className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {asignando === ppc.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Asignando...
                                </>
                              ) : (
                                'Asignar Guardia'
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : !cargandoPPCs ? (
                  <div className="text-center py-8 text-gray-400">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay PPCs activos en esta instalación</p>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial de Asignaciones */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-100 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Asignaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {asignacionData?.historial && asignacionData.historial.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-gray-800/50">
                    <TableHead className="text-gray-300">Instalación</TableHead>
                    <TableHead className="text-gray-300">Rol</TableHead>
                    <TableHead className="text-gray-300">Fecha de Asignación</TableHead>
                    <TableHead className="text-gray-300">Fecha de Término</TableHead>
                    <TableHead className="text-gray-300">Estado</TableHead>
                    <TableHead className="text-gray-300">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asignacionData.historial.map((asignacion) => (
                    <TableRow key={asignacion.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-gray-100">
                        <Link 
                          href={`/instalaciones/${asignacion.instalacion_id}`}
                          className="hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
                        >
                          {asignacion.instalacion}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-300">{asignacion.rol}</TableCell>
                      <TableCell className="text-gray-300">
                        {formatearFecha(asignacion.fecha_asignacion)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {asignacion.fecha_termino ? formatearFecha(asignacion.fecha_termino) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={asignacion.estado === 'Activa' ? 'default' : 'secondary'}
                          className={
                            asignacion.estado === 'Activa' 
                              ? 'bg-green-900/50 text-green-200 border-green-700' 
                              : 'bg-gray-900/50 text-gray-300 border-gray-700'
                          }
                        >
                          {asignacion.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-400">{asignacion.tipo}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay historial de asignaciones</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 