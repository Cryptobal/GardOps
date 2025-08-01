'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Trash2, X, UserPlus, UserMinus } from 'lucide-react';
import { 
  getTurnosInstalacion, 
  getRolesServicio, 
  crearTurnoInstalacion,
  getPPCsInstalacion,
  eliminarTurnoInstalacion,
  getGuardiasDisponibles,
  desasignarGuardiaPPC,
  asignarGuardiaPPC,
  eliminarPPC,
  agregarPuestosARol
} from '@/lib/api/instalaciones';
import { 
  TurnoInstalacionConDetalles, 
  RolServicio, 
  CrearTurnoInstalacionData 
} from '@/lib/schemas/instalaciones';
import AsignarGuardiaModal from './AsignarGuardiaModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import InfoTurnos from './InfoTurnos';

interface TurnosInstalacionProps {
  instalacionId: string;
  // Props opcionales para datos precargados
  turnosPrecargados?: TurnoInstalacionConDetalles[];
  ppcsPrecargados?: PPC[];
  guardiasPrecargados?: GuardiaDisponible[];
  rolesPrecargados?: RolServicio[];
}

interface PPC {
  id: string;
  instalacion_id: string;
  rol_servicio_id: string;
  motivo: string;
  observacion: string | null;
  creado_en: string;
  rol_servicio_nombre: string;
  hora_inicio: string;
  hora_termino: string;
  cantidad_faltante: number;
  estado: string;
  guardia_asignado_id?: string;
  guardia_nombre?: string;
}

interface GuardiaDisponible {
  id: string;
  nombre_completo: string;
  rut: string;
  comuna: string;
}

export default function TurnosInstalacion({ 
  instalacionId, 
  turnosPrecargados,
  ppcsPrecargados,
  guardiasPrecargados,
  rolesPrecargados
}: TurnosInstalacionProps) {
  const { toast } = useToast();
  const [turnos, setTurnos] = useState<TurnoInstalacionConDetalles[]>(turnosPrecargados || []);
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>(rolesPrecargados || []);
  const [ppcs, setPpcs] = useState<PPC[]>(ppcsPrecargados || []);
  const [guardiasDisponibles, setGuardiasDisponibles] = useState<GuardiaDisponible[]>(guardiasPrecargados || []);
  const [loading, setLoading] = useState(!turnosPrecargados); // Solo loading si no hay datos precargados
  const [creando, setCreando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ppcSeleccionado, setPpcSeleccionado] = useState<PPC | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [turnoToDelete, setTurnoToDelete] = useState<string | null>(null);
  const [asignando, setAsignando] = useState<string | null>(null);
  const [desasignando, setDesasignando] = useState<string | null>(null);
  const [eliminandoPuesto, setEliminandoPuesto] = useState<string | null>(null);
  const [agregandoPuestos, setAgregandoPuestos] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ppcId: string, puestoIndex: number} | null>(null);
  const [formData, setFormData] = useState<CrearTurnoInstalacionData>({
    instalacion_id: instalacionId,
    rol_servicio_id: '',
    cantidad_guardias: 1
  });

  useEffect(() => {
    // Si no hay datos precargados, cargarlos
    if (!turnosPrecargados) {
      cargarDatos();
    }
  }, [instalacionId, turnosPrecargados]);

  // Actualizar estado cuando cambien los datos precargados
  useEffect(() => {
    if (turnosPrecargados) {
      setTurnos(turnosPrecargados);
    }
    if (ppcsPrecargados) {
      setPpcs(ppcsPrecargados);
    }
    if (guardiasPrecargados) {
      setGuardiasDisponibles(guardiasPrecargados);
    }
    if (rolesPrecargados) {
      setRolesServicio(rolesPrecargados);
    }
  }, [turnosPrecargados, ppcsPrecargados, guardiasPrecargados, rolesPrecargados]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [turnosData, rolesData, ppcsData, guardiasData] = await Promise.all([
        getTurnosInstalacion(instalacionId),
        getRolesServicio(),
        getPPCsInstalacion(instalacionId),
        getGuardiasDisponibles()
      ]);
      setTurnos(turnosData);
      setRolesServicio(rolesData);
      setPpcs(ppcsData);
      setGuardiasDisponibles(guardiasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('No se pudieron cargar los datos de turnos', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTurno = async () => {
    if (!formData.rol_servicio_id || formData.cantidad_guardias < 1) {
      toast.error('Por favor completa todos los campos requeridos', 'Error');
      return;
    }

    try {
      setCreando(true);
      await crearTurnoInstalacion(formData);
      
      toast.success(`Turno creado correctamente: ${formData.cantidad_guardias} guardias`, 'Éxito');

      // Limpiar formulario
      setFormData({
        instalacion_id: instalacionId,
        rol_servicio_id: '',
        cantidad_guardias: 1
      });

      // Recargar datos
      await cargarDatos();
    } catch (error) {
      console.error('Error creando turno:', error);
      toast.error('No se pudo crear el turno', 'Error');
    } finally {
      setCreando(false);
    }
  };

  const handleAsignarGuardiaDirecto = async (ppcId: string, guardiaId: string) => {
    try {
      setAsignando(ppcId);
      await asignarGuardiaPPC(instalacionId, ppcId, guardiaId);
      toast.success('Guardia asignado correctamente', 'Éxito');
      await cargarDatos();
    } catch (error) {
      console.error('Error asignando guardia:', error);
      toast.error('No se pudo asignar el guardia', 'Error');
    } finally {
      setAsignando(null);
    }
  };

  const handleDesasignarGuardia = async (ppcId: string) => {
    try {
      setDesasignando(ppcId);
      await desasignarGuardiaPPC(instalacionId, ppcId);
      toast.success('Guardia desasignado correctamente', 'Éxito');
      await cargarDatos();
    } catch (error) {
      console.error('Error desasignando guardia:', error);
      toast.error('No se pudo desasignar el guardia', 'Error');
    } finally {
      setDesasignando(null);
    }
  };

  const handleClickPPC = (ppc: PPC) => {
    setPpcSeleccionado(ppc);
    setModalAbierto(true);
  };

  const handleAsignacionCompletada = () => {
    cargarDatos();
  };

  const handleEliminarTurno = (turnoId: string) => {
    setTurnoToDelete(turnoId);
    setDeleteModalOpen(true);
  };

  const confirmarEliminar = async () => {
    try {
      if (turnoToDelete) {
        await eliminarTurnoInstalacion(instalacionId, turnoToDelete);
        toast.success('Turno eliminado correctamente', 'Éxito');
        await cargarDatos(); // Recargar datos para actualizar la vista
      }
    } catch (error) {
      console.error('Error eliminando turno:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el turno', 'Error');
    }
  };

  const handleEliminarPuesto = (ppcId: string, puestoIndex: number) => {
    setShowDeleteConfirm({ ppcId, puestoIndex });
  };

  const confirmarEliminarPuesto = async () => {
    if (!showDeleteConfirm) return;

    try {
      setEliminandoPuesto(showDeleteConfirm.ppcId);
      // Por ahora eliminamos el PPC completo
      // TODO: Implementar lógica para eliminar solo un puesto específico
      await eliminarPPC(instalacionId, showDeleteConfirm.ppcId);
      toast.success('Puesto eliminado correctamente', 'Éxito');
      await cargarDatos();
    } catch (error) {
      console.error('Error eliminando puesto:', error);
      toast.error('No se pudo eliminar el puesto', 'Error');
    } finally {
      setEliminandoPuesto(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleAgregarPuestos = async (turnoId: string, rolServicioId: string, cantidad: number = 1) => {
    try {
      setAgregandoPuestos(rolServicioId);
      await agregarPuestosARol(instalacionId, turnoId, cantidad);
      toast.success(`${cantidad} puesto(s) agregado(s) correctamente`, 'Éxito');
      await cargarDatos();
    } catch (error) {
      console.error('Error agregando puestos:', error);
      toast.error('No se pudieron agregar los puestos', 'Error');
    } finally {
      setAgregandoPuestos(null);
    }
  };

  const formatearHorario = (horaInicio: string, horaTermino: string) => {
    return `${horaInicio} a ${horaTermino}`;
  };

  const formatearCiclo = (diasTrabajo: number, diasDescanso: number) => {
    return `${diasTrabajo}x${diasDescanso}`;
  };

  const getEstadoColor = (guardiasAsignados: number, cantidadGuardias: number, ppcPendientes: number) => {
    if (guardiasAsignados >= cantidadGuardias) return 'bg-green-500';
    if (guardiasAsignados > 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getEstadoTexto = (guardiasAsignados: number, cantidadGuardias: number, ppcPendientes: number) => {
    if (guardiasAsignados >= cantidadGuardias) return '✅ Completo';
    if (guardiasAsignados > 0) return '⚠️ Parcial';
    return '❌ Vacante';
  };

  const getPPCsPorRol = (rolServicioId: string) => {
    return ppcs.filter(ppc => ppc.rol_servicio_id === rolServicioId);
  };

  const getPPCColor = (estado: string) => {
    switch (estado) {
      case 'Asignado':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/40';
      case 'Pendiente':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/40';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-950/40';
    }
  };

  const getPPCStatusColor = (estado: string) => {
    switch (estado) {
      case 'Asignado':
        return 'text-green-600';
      case 'Pendiente':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Turnos de Instalación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔄 Turnos de Instalación</span>
          <Badge variant="secondary">{turnos.length} turnos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información explicativa */}
        {turnos.length > 0 && (
          <InfoTurnos 
            totalPuestos={turnos.reduce((sum, turno) => sum + turno.cantidad_guardias, 0)}
            puestosAsignados={turnos.reduce((sum, turno) => sum + turno.guardias_asignados, 0)}
            puestosPendientes={turnos.reduce((sum, turno) => sum + turno.ppc_pendientes, 0)}
          />
        )}

        {/* Lista de Turnos con PPCs */}
        <div className="space-y-6">
          {turnos.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay turnos configurados para esta instalación
            </div>
          ) : (
            turnos.map((turno) => {
              const ppcsDelRol = getPPCsPorRol(turno.rol_servicio_id);
              const ppcsPendientes = turno.ppc_pendientes;
              const ppcsAsignados = turno.guardias_asignados;
              
              return (
                <Card key={turno.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{turno.rol_servicio.nombre}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <Badge variant="outline">
                            {formatearCiclo(turno.rol_servicio.dias_trabajo, turno.rol_servicio.dias_descanso)}
                          </Badge>
                          <span>{formatearHorario(turno.rol_servicio.hora_inicio, turno.rol_servicio.hora_termino)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Total Puestos</div>
                          <div className="font-bold">{turno.cantidad_guardias}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Asignados</div>
                          <div className="font-bold text-green-600">{ppcsAsignados}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">PPCs</div>
                          <div className="font-bold text-red-600">{ppcsPendientes}</div>
                        </div>
                        <Badge 
                          className={getEstadoColor(
                            ppcsAsignados, 
                            turno.cantidad_guardias, 
                            ppcsPendientes
                          )}
                        >
                          {getEstadoTexto(
                            ppcsAsignados, 
                            turno.cantidad_guardias, 
                            ppcsPendientes
                          )}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEliminarTurno(turno.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Eliminar turno"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* PPCs del Rol */}
                  {ppcsDelRol.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          📋 Puestos Por Cubrir ({ppcsDelRol.length})
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                          {ppcsDelRol.flatMap((ppc) => 
                            Array.from({ length: ppc.cantidad_faltante }, (_, index) => (
                              <div
                                key={`${ppc.id}-${index}`}
                                className={`p-3 border rounded-lg transition-colors ${getPPCColor(ppc.estado)} relative`}
                              >
                                {/* Botón X para eliminar puesto */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEliminarPuesto(ppc.id, index)}
                                  disabled={eliminandoPuesto === ppc.id}
                                  className="absolute top-1 right-1 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Eliminar puesto"
                                >
                                  {eliminandoPuesto === ppc.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                  ) : (
                                    <X className="w-3 h-3" />
                                  )}
                                </Button>

                                <div className="flex items-center justify-between pr-6">
                                  <div>
                                    <div className="font-medium text-sm">Puesto #{index + 1}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {ppc.estado === 'Asignado' 
                                        ? `Guardia: ${ppc.guardia_nombre || 'Sin nombre'}`
                                        : 'Pendiente de asignación'
                                      }
                                    </div>
                                  </div>
                                  <div className={`text-xs font-medium ${getPPCStatusColor(ppc.estado)}`}>
                                    {ppc.estado}
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  PPC: {ppc.id.slice(-4)}
                                </div>
                                
                                {/* Acciones del PPC */}
                                <div className="mt-3 flex gap-2">
                                  {ppc.estado === 'Pendiente' ? (
                                    <div className="flex-1">
                                      <Select
                                        onValueChange={(guardiaId) => handleAsignarGuardiaDirecto(ppc.id, guardiaId)}
                                        disabled={asignando === ppc.id}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="Asignar guardia" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {guardiasDisponibles.map((guardia) => (
                                            <SelectItem key={guardia.id} value={guardia.id}>
                                              {guardia.nombre_completo} ({guardia.comuna})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDesasignarGuardia(ppc.id)}
                                      disabled={desasignando === ppc.id}
                                      className="flex-1 h-8 text-xs text-red-600 hover:text-red-700"
                                    >
                                      {desasignando === ppc.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      ) : (
                                        <>
                                          <UserMinus className="w-3 h-3 mr-1" />
                                          Desasignar
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                          
                          {/* Botón + para agregar más puestos */}
                          <div className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAgregarPuestos(turno.id, turno.rol_servicio_id, 1)}
                              disabled={agregandoPuestos === turno.rol_servicio_id}
                              className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Agregar más puestos"
                            >
                              {agregandoPuestos === turno.rol_servicio_id ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                              ) : (
                                <>
                                  <UserPlus className="w-6 h-6 mb-1" />
                                  <span className="text-xs">Agregar Puesto</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Formulario para crear nuevo turno */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">➕ Crear Nuevo Turno</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol de Servicio</label>
              <Select
                value={formData.rol_servicio_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rol_servicio_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {rolesServicio.map((rol) => (
                    <SelectItem key={rol.id} value={rol.id}>
                      {rol.nombre} ({formatearCiclo(rol.dias_trabajo, rol.dias_descanso)} - {formatearHorario(rol.hora_inicio, rol.hora_termino)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad de Guardias</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={formData.cantidad_guardias}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  cantidad_guardias: parseInt(e.target.value) || 1 
                }))}
                placeholder="1-20"
              />
            </div>

            <Button 
              onClick={handleCrearTurno}
              disabled={creando || !formData.rol_servicio_id}
              className="w-full"
            >
              {creando ? 'Creando...' : 'Crear Turno'}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Modal para asignar guardias (mantener para compatibilidad) */}
      <AsignarGuardiaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        instalacionId={instalacionId}
        ppcId={ppcSeleccionado?.id || ''}
        rolServicioNombre={ppcSeleccionado?.rol_servicio_nombre || ''}
        onAsignacionCompletada={handleAsignacionCompletada}
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTurnoToDelete(null);
        }}
        onConfirm={confirmarEliminar}
        title="Eliminar Turno"
        message="¿Estás seguro de que quieres eliminar este turno? Esta acción no se puede deshacer."
        confirmText="Eliminar Turno"
        cancelText="Cancelar"
      />

      {/* Modal de confirmación para eliminar puesto */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={confirmarEliminarPuesto}
        title="Eliminar Puesto"
        message={`¿Estás seguro de que quieres eliminar el puesto #${showDeleteConfirm?.puestoIndex ? showDeleteConfirm.puestoIndex + 1 : ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Puesto"
        cancelText="Cancelar"
      />
    </Card>
  );
} 