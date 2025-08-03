'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { SafeSelect } from '@/components/ui/safe-select';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Trash2, X, UserPlus, UserMinus, Search, ChevronDown } from 'lucide-react';
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
import AsignarGuardiaDropdown from './AsignarGuardiaDropdown';
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
  const router = useRouter();
  const [turnos, setTurnos] = useState<TurnoInstalacionConDetalles[]>(turnosPrecargados || []);
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>(rolesPrecargados || []);
  const [ppcs, setPpcs] = useState<PPC[]>(ppcsPrecargados || []);
  const [guardiasDisponibles, setGuardiasDisponibles] = useState<GuardiaDisponible[]>(guardiasPrecargados || []);
  const [filtrosGuardias, setFiltrosGuardias] = useState<{[key: string]: string}>({});
  const [selectsOpen, setSelectsOpen] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(!turnosPrecargados); // Solo loading si no hay datos precargados
  const [creando, setCreando] = useState(false);

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

  // Función para filtrar guardias por nombre, apellido o RUT
  const getGuardiasFiltrados = (filtro: string) => {
    return guardiasDisponibles.filter(guardia => {
      if (!filtro.trim()) return true;
      
      const filtroLower = filtro.toLowerCase().trim();
      const nombreCompleto = guardia.nombre_completo.toLowerCase();
      const rut = guardia.rut.toLowerCase();
      
      // Filtrar por nombre completo (nombre + apellidos)
      if (nombreCompleto.includes(filtroLower)) return true;
      
      // Filtrar por RUT
      if (rut.includes(filtroLower)) return true;
      
      // Filtrar por apellidos específicos
      const apellidos = guardia.nombre_completo.split(' ').slice(1).join(' ').toLowerCase();
      if (apellidos.includes(filtroLower)) return true;
      
      // Filtrar por nombre específico
      const nombre = guardia.nombre_completo.split(' ')[0].toLowerCase();
      if (nombre.includes(filtroLower)) return true;
      
      return false;
    });
  };

  // Función para limpiar todos los filtros
  const limpiarTodosLosFiltros = () => {
    setFiltrosGuardias({});
  };

  // Función para preservar filtros activos
  const preservarFiltrosActivos = () => {
    const filtrosActivos = Object.keys(filtrosGuardias).filter(key => filtrosGuardias[key].trim() !== '');
    return filtrosActivos.length > 0;
  };

  // Función para limpiar solo los selects abiertos sin afectar los filtros
  const limpiarSelects = () => {
    setSelectsOpen({});
    // Forzar blur en cualquier elemento enfocado
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  useEffect(() => {
    // Siempre cargar datos frescos para asegurar que tenemos la información más actualizada
    cargarDatos();
  }, [instalacionId]);

  // Limpiar estados al desmontar el componente
  useEffect(() => {
    return () => {
      limpiarEstados();
    };
  }, []);

  // Manejar clics fuera del componente para cerrar dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        limpiarSelects();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


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
      
      // Cargar datos de forma individual para manejar errores por separado
      const promises = [
        getTurnosInstalacion(instalacionId).catch(error => {
          console.error('Error cargando turnos:', error);
          return [];
        }),
        getRolesServicio().catch(error => {
          console.error('Error cargando roles:', error);
          return [];
        }),
        getPPCsInstalacion(instalacionId).catch(error => {
          console.error('Error cargando PPCs:', error);
          return [];
        }),
        getGuardiasDisponibles().catch(error => {
          console.error('Error cargando guardias:', error);
          return [];
        })
      ];
      
      const [turnosData, rolesData, ppcsData, guardiasData] = await Promise.all(promises);
      
      setTurnos(turnosData);
      setRolesServicio(rolesData);
      setPpcs(ppcsData);
      setGuardiasDisponibles(guardiasData);
      
      // Preservar los estados de filtros y selects
      // No limpiar filtrosGuardias ni selectsOpen aquí
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

      // Recargar datos de forma más robusta
      try {
        await cargarDatos();
      } catch (reloadError) {
        console.error('Error recargando datos después de crear turno:', reloadError);
        // No mostrar error al usuario si la creación fue exitosa
      }
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
      
      // Limpiar filtro después de asignar
      setFiltrosGuardias(prev => {
        const newFiltros = { ...prev };
        delete newFiltros[ppcId];
        return newFiltros;
      });
      
      toast.success('Guardia asignado correctamente', 'Éxito');
      await cargarDatos();
    } catch (error) {
      console.error('Error asignando guardia:', error);
      toast.error('No se pudo asignar el guardia', 'Error');
    } finally {
      setAsignando(null);
    }
  };

  // Función para limpiar todos los estados de filtros y selects
  const limpiarEstados = () => {
    setFiltrosGuardias({});
    setSelectsOpen({});
    // Forzar blur en cualquier elemento enfocado
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
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

  const handleAsignacionCompletada = () => {
    cargarDatos();
  };

  const handleNavegarAGuardia = (guardiaId: string) => {
    if (guardiaId) {
      router.push(`/guardias/${guardiaId}`);
    }
  };

  const handleEliminarTurno = (turnoId: string) => {
    setTurnoToDelete(turnoId);
    setDeleteModalOpen(true);
  };

  const confirmarEliminar = async () => {
    try {
      if (turnoToDelete) {
        await eliminarTurnoInstalacion(instalacionId, turnoToDelete);
        toast.success('Todos los puestos eliminados correctamente', 'Éxito');
        await cargarDatos(); // Recargar datos para actualizar la vista
      }
    } catch (error) {
      console.error('Error eliminando puestos:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudieron eliminar los puestos', 'Error');
    } finally {
      // Cerrar el modal automáticamente después de completar la operación
      setTurnoToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const handleEliminarPuesto = (ppcId: string, puestoIndex: number) => {
    console.log('🔍 handleEliminarPuesto llamado:', { ppcId, puestoIndex });
    setShowDeleteConfirm({ ppcId, puestoIndex });
  };

  const confirmarEliminarPuesto = async () => {
    console.log('🔍 confirmarEliminarPuesto llamado:', showDeleteConfirm);
    if (!showDeleteConfirm) return;

    try {
      setEliminandoPuesto(showDeleteConfirm.ppcId);
      
      console.log('🔍 Llamando a eliminarPPC:', { instalacionId, ppcId: showDeleteConfirm.ppcId });
      const resultado = await eliminarPPC(instalacionId, showDeleteConfirm.ppcId);
      
      console.log('🔍 Resultado de eliminarPPC:', resultado);
      
      // Mostrar mensaje según el resultado
      if (resultado.fueEliminado) {
        toast.success(resultado.mensaje, 'Éxito');
      } else if (resultado.fueInactivado) {
        toast.warning(resultado.mensaje, 'Aviso');
      }
      
      // Recargar datos de forma más robusta
      try {
        await cargarDatos();
      } catch (reloadError) {
        console.error('Error recargando datos después de eliminar:', reloadError);
        // No mostrar error al usuario si la eliminación fue exitosa
      }
    } catch (error) {
      console.error('Error eliminando puesto:', error);
      toast.error('No se pudo eliminar el puesto', 'Error');
    } finally {
      setEliminandoPuesto(null);
      // Cerrar el modal automáticamente después de completar la operación
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
    return ppcs.filter(ppc => 
      ppc.rol_servicio_id === rolServicioId && 
      ppc.estado === 'Pendiente'
    );
  };

  const getPPCsAsignadosPorRol = (rolServicioId: string) => {
    return ppcs.filter(ppc => 
      ppc.rol_servicio_id === rolServicioId && 
      ppc.estado === 'Asignado'
    );
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🔄 Turnos de Instalación</span>
            <Badge variant="secondary">{turnos.length} turnos</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información explicativa y formulario en una línea */}
        {turnos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* InfoTurnos a la izquierda */}
            <div>
              <InfoTurnos 
                totalPuestos={turnos.reduce((sum, turno) => sum + turno.cantidad_guardias, 0)}
                puestosAsignados={turnos.reduce((sum, turno) => sum + turno.guardias_asignados, 0)}
                puestosPendientes={turnos.reduce((sum, turno) => sum + turno.ppc_pendientes, 0)}
              />
            </div>

            {/* Formulario para crear nuevo turno a la derecha */}
            <Card className="border-0 bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium text-slate-300">➕ Crear Nuevo Turno</span>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Rol de Servicio</label>
                      <SafeSelect
                        value={formData.rol_servicio_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, rol_servicio_id: value }))}
                        placeholder="Seleccionar rol"
                      >
                        <SelectContent>
                          {rolesServicio.map((rol) => (
                            <SelectItem key={rol.id} value={rol.id}>
                              {rol.nombre} ({formatearCiclo(rol.dias_trabajo, rol.dias_descanso)} - {formatearHorario(rol.hora_inicio, rol.hora_termino)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SafeSelect>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Cantidad de Guardias</label>
                      <SafeSelect
                        value={formData.cantidad_guardias.toString()}
                        onValueChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          cantidad_guardias: parseInt(value) || 1 
                        }))}
                        placeholder="Seleccionar cantidad"
                      >
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((numero) => (
                            <SelectItem key={numero} value={numero.toString()}>
                              {numero} {numero === 1 ? 'guardia' : 'guardias'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SafeSelect>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCrearTurno}
                    disabled={creando || !formData.rol_servicio_id}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {creando ? 'Creando...' : 'Crear Turno'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Si no hay turnos, mostrar solo el formulario centrado */}
        {turnos.length === 0 && (
          <div className="flex justify-center">
            <div className="border rounded-lg p-6 bg-card/50 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">➕ Crear Nuevo Turno</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol de Servicio</label>
                  <SafeSelect
                    value={formData.rol_servicio_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, rol_servicio_id: value }))}
                    placeholder="Seleccionar rol"
                  >
                    <SelectContent>
                      {rolesServicio.map((rol) => (
                        <SelectItem key={rol.id} value={rol.id}>
                          {rol.nombre} ({formatearCiclo(rol.dias_trabajo, rol.dias_descanso)} - {formatearHorario(rol.hora_inicio, rol.hora_termino)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SafeSelect>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Cantidad de Guardias</label>
                  <SafeSelect
                    value={formData.cantidad_guardias.toString()}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      cantidad_guardias: parseInt(value) || 1 
                    }))}
                    placeholder="Seleccionar cantidad"
                  >
                    <SelectContent>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((numero) => (
                        <SelectItem key={numero} value={numero.toString()}>
                          {numero} {numero === 1 ? 'guardia' : 'guardias'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SafeSelect>
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
          </div>
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
              const ppcsAsignadosDelRol = getPPCsAsignadosPorRol(turno.rol_servicio_id);
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
                          title="Eliminar todos los puestos"
                        >
                          Eliminar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAgregarPuestos(turno.id, turno.rol_servicio_id, 1)}
                          disabled={agregandoPuestos === turno.rol_servicio_id}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Agregar puesto"
                        >
                          {agregandoPuestos === turno.rol_servicio_id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Puestos por cubrir */}
                  {ppcsDelRol.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          📋 Puestos Por Cubrir ({ppcsDelRol.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                          {ppcsDelRol.flatMap((ppc) => 
                            Array.from({ length: ppc.cantidad_faltante }, (_, index) => (
                              <div
                                key={`${ppc.id}-${index}`}
                                className="p-2 sm:p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 rounded-lg transition-colors relative"
                              >
                                {/* Botón X para eliminar puesto */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEliminarPuesto(ppc.id, index)}
                                  disabled={eliminandoPuesto === ppc.id}
                                  className="absolute top-1 right-1 h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Eliminar puesto"
                                >
                                  {eliminandoPuesto === ppc.id ? (
                                    <div className="animate-spin rounded-full h-2 w-2 sm:h-3 sm:w-3 border-b-2 border-red-600"></div>
                                  ) : (
                                    <X className="w-2 h-2 sm:w-3 sm:h-3" />
                                  )}
                                </Button>

                                <div className="flex items-center justify-between pr-5 sm:pr-6">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-xs sm:text-sm truncate text-red-800 dark:text-red-200">
                                      Puesto #{index + 1}
                                    </div>
                                    <div className="text-xs text-red-600 dark:text-red-400 truncate">
                                      {ppc.rol_servicio_nombre}
                                    </div>
                                  </div>
                                  <div className="text-xs font-medium text-red-600 flex-shrink-0 ml-1">
                                    Pendiente
                                  </div>
                                </div>
                                {/* Dropdown para asignar guardia */}
                                <div className="mt-2 sm:mt-3">
                                  <AsignarGuardiaDropdown
                                    instalacionId={instalacionId}
                                    ppcId={ppc.id}
                                    rolServicioNombre={ppc.rol_servicio_nombre}
                                    onAsignacionCompletada={handleAsignacionCompletada}
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}

                  {/* Puestos Asignados */}
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">
                        ✅ Puestos Asignados ({ppcsAsignadosDelRol.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        {ppcsAsignadosDelRol.length > 0 ? (
                          ppcsAsignadosDelRol.flatMap((ppc) => 
                            Array.from({ length: ppc.cantidad_faltante }, (_, index) => (
                              <div
                                key={`asignado-${ppc.id}-${index}`}
                                className="p-2 sm:p-3 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 rounded-lg transition-colors relative"
                              >
                                {/* Botón X para eliminar puesto */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEliminarPuesto(ppc.id, index)}
                                  disabled={eliminandoPuesto === ppc.id}
                                  className="absolute top-1 right-1 h-5 w-5 sm:h-6 sm:w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Eliminar puesto"
                                >
                                  {eliminandoPuesto === ppc.id ? (
                                    <div className="animate-spin rounded-full h-2 w-2 sm:h-3 sm:w-3 border-b-2 border-red-600"></div>
                                  ) : (
                                    <X className="w-2 h-2 sm:w-3 sm:h-3" />
                                  )}
                                </Button>

                                <div className="flex items-start justify-between pr-5 sm:pr-6">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-xs sm:text-sm text-green-800 dark:text-green-200">Puesto #{index + 1}</div>
                                    <div className="text-xs text-green-600 dark:text-green-400 break-words">
                                      Guardia: 
                                      {ppc.guardia_asignado_id ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNavegarAGuardia(ppc.guardia_asignado_id!);
                                          }}
                                          className="hover:underline cursor-pointer font-medium"
                                          title="Ver perfil del guardia"
                                        >
                                          {ppc.guardia_nombre || 'Sin nombre'}
                                        </button>
                                      ) : (
                                        <span>{ppc.guardia_nombre || 'Sin nombre'}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs font-medium text-green-600 flex-shrink-0 ml-2">
                                    Asignado
                                  </div>
                                </div>
                                {/* Botón para desasignar */}
                                <div className="mt-2 sm:mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDesasignarGuardia(ppc.id)}
                                    disabled={desasignando === ppc.id}
                                    className="w-full h-8 text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
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
                                </div>
                              </div>
                            ))
                          )
                        ) : (
                          <div className="col-span-full p-4 text-center text-gray-500 dark:text-gray-400">
                            <div className="text-sm">No hay puestos asignados</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>



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
        onClose={() => {
          console.log('🔍 Cerrando modal de eliminar puesto');
          setShowDeleteConfirm(null);
        }}
        onConfirm={confirmarEliminarPuesto}
        title="Eliminar Puesto"
        message={`¿Estás seguro de que quieres eliminar el puesto #${showDeleteConfirm?.puestoIndex ? showDeleteConfirm.puestoIndex + 1 : ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Puesto"
        cancelText="Cancelar"
      />
    </Card>
  );
} 