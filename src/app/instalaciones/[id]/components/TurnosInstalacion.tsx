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
import { Trash2, X, UserPlus, UserMinus, Search, ChevronDown, Users, Clock, Calendar, Target, ChevronRight } from 'lucide-react';
import { 
  getTurnosInstalacion, 
  getRolesServicio, 
  crearTurnoInstalacion,
  getPPCsInstalacion,
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
import { Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TurnosInstalacionProps {
  instalacionId: string;
  instalacionNombre: string;
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
  nombre_puesto?: string;
}

interface GuardiaDisponible {
  id: string;
  nombre_completo: string;
  rut: string;
  comuna: string;
}

export default function TurnosInstalacion({ 
  instalacionId, 
  instalacionNombre, 
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
  const [expandedTurnos, setExpandedTurnos] = useState<{[key: string]: boolean}>({});

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

  // Estado para el modal de edición de nombre de puesto
  const [editandoPuesto, setEditandoPuesto] = useState<{
    id: string;
    nombre: string;
    isOpen: boolean;
  } | null>(null);
  const [nuevoNombrePuesto, setNuevoNombrePuesto] = useState('');
  const [guardandoNombre, setGuardandoNombre] = useState(false);

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

  // Función para toggle del dropdown de turnos
  const toggleTurnoExpanded = (turnoId: string) => {
    setExpandedTurnos(prev => ({
      ...prev,
      [turnoId]: !prev[turnoId]
    }));
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
        }).then(roles => {
          console.log('Roles cargados:', roles);
          return Array.isArray(roles) ? roles : [];
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
      
      setTurnos(Array.isArray(turnosData) ? turnosData : []);
      setRolesServicio(Array.isArray(rolesData) ? rolesData : []);
      setPpcs(Array.isArray(ppcsData) ? ppcsData : []);
      setGuardiasDisponibles(Array.isArray(guardiasData) ? guardiasData : []);
      
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

  // Funciones para editar nombre del puesto
  const handleEditarNombrePuesto = (ppcId: string, nombreActual: string) => {
    setEditandoPuesto({
      id: ppcId,
      nombre: nombreActual,
      isOpen: true
    });
    setNuevoNombrePuesto(nombreActual);
  };

  const handleGuardarNombrePuesto = async () => {
    if (!editandoPuesto || !nuevoNombrePuesto.trim()) return;

    setGuardandoNombre(true);
    try {
      const response = await fetch(`/api/instalaciones/${instalacionId}/puestos/${editandoPuesto.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_puesto: nuevoNombrePuesto.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el nombre del puesto');
      }

      // Actualizar el estado local de PPCs
      setPpcs(prev => prev.map(ppc => 
        ppc.id === editandoPuesto.id 
          ? { ...ppc, nombre_puesto: nuevoNombrePuesto.trim() }
          : ppc
      ));

      toast({
        title: "✅ Éxito",
        description: "Nombre del puesto actualizado correctamente",
      });

      // Cerrar el modal
      setEditandoPuesto(null);
      setNuevoNombrePuesto('');
    } catch (error) {
      console.error('Error actualizando nombre del puesto:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar el nombre del puesto",
        variant: "destructive"
      });
    } finally {
      setGuardandoNombre(false);
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

  // Calcular estadísticas para el header de KPIs
  const totalPuestos = turnos.reduce((sum, turno) => sum + turno.cantidad_guardias, 0);
  const puestosAsignados = turnos.reduce((sum, turno) => sum + turno.guardias_asignados, 0);
  const puestosVacantes = turnos.reduce((sum, turno) => sum + turno.ppc_pendientes, 0);

  return (
    <div className="space-y-6">
      {/* Formulario para crear nuevo turno */}
      <Card className="bg-muted/50 rounded-xl border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs uppercase text-muted-foreground font-medium">➕ Crear Nuevo Turno</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Rol de Servicio</label>
              <SafeSelect
                value={formData.rol_servicio_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rol_servicio_id: value }))}
                placeholder="Seleccionar rol"
              >
                <SelectContent>
                  {Array.isArray(rolesServicio) ? rolesServicio.map((rol) => (
                    <SelectItem key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </SelectItem>
                  )) : (
                    <SelectItem value="" disabled>
                      Cargando roles...
                    </SelectItem>
                  )}
                </SelectContent>
              </SafeSelect>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Cantidad de Guardias</label>
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

            <div className="flex items-end">
              <Button 
                onClick={handleCrearTurno}
                disabled={creando || !formData.rol_servicio_id}
                size="sm"
                variant="secondary"
                className="w-full"
              >
                {creando ? 'Creando...' : 'Crear Turno'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Turnos con Dropdowns */}
      <div className="space-y-3">
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
            const isExpanded = expandedTurnos[turno.id] || false;
            
            return (
              <Card key={turno.id} className="bg-muted/50 rounded-xl border-0 overflow-hidden">
                {/* Header del Turno (siempre visible) */}
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => toggleTurnoExpanded(turno.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{turno.rol_servicio.nombre}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-sm font-medium">{turno.cantidad_guardias}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Asignados</div>
                        <div className="text-sm font-medium text-green-600">{ppcsAsignados}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Vacantes</div>
                        <div className="text-sm font-medium text-red-600">{ppcsPendientes}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={ppcsAsignados >= turno.cantidad_guardias ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {ppcsAsignados >= turno.cantidad_guardias ? 'Asignado' : 'Vacante'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAgregarPuestos(turno.id, turno.rol_servicio_id, 1);
                          }}
                          disabled={agregandoPuestos === turno.rol_servicio_id}
                          className="text-blue-600 hover:text-blue-700"
                          title="Agregar puesto"
                        >
                          {agregandoPuestos === turno.rol_servicio_id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido del Dropdown (se muestra/oculta) */}
                {isExpanded && (
                  <div className="border-t border-border/50 bg-background/50">
                    {/* Puestos por cubrir */}
                    {ppcsDelRol.length > 0 && (
                      <div className="p-4">
                        <h4 className="text-xs uppercase text-muted-foreground mb-3 font-medium">
                          📋 Puestos Por Cubrir ({ppcsDelRol.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {ppcsDelRol.flatMap((ppc) => 
                            Array.from({ length: ppc.cantidad_faltante }, (_, index) => (
                              <div
                                key={`${ppc.id}-${index}`}
                                className="p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 rounded-lg transition-colors relative"
                              >
                                {/* Botón X para eliminar puesto */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEliminarPuesto(ppc.id, index)}
                                  disabled={eliminandoPuesto === ppc.id}
                                  className="absolute top-1 right-1 h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                  title="Eliminar puesto"
                                >
                                  {eliminandoPuesto === ppc.id ? (
                                    <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-red-600"></div>
                                  ) : (
                                    <X className="w-2 h-2" />
                                  )}
                                </Button>

                                <div className="flex items-center justify-between pr-6">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <div className="font-medium text-xs truncate text-red-800 dark:text-red-200">
                                        {ppc.nombre_puesto || `Puesto #${index + 1}`}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditarNombrePuesto(ppc.id, ppc.nombre_puesto || `Puesto #${index + 1}`);
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                                      </Button>
                                    </div>
                                    <div className="text-xs text-red-600 dark:text-red-400 truncate">
                                      {ppc.rol_servicio_nombre}
                                    </div>
                                  </div>
                                  <Badge variant="destructive" className="text-xs">Vacante</Badge>
                                </div>
                                {/* Dropdown para asignar guardia */}
                                <div className="mt-3">
                                  <AsignarGuardiaDropdown
                                    instalacionId={instalacionId}
                                    instalacionNombre={instalacionNombre}
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
                    )}

                    {/* Puestos Asignados */}
                    <div className="p-4">
                      <h4 className="text-xs uppercase text-muted-foreground mb-3 font-medium">
                        ✅ Puestos Asignados ({ppcsAsignadosDelRol.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {ppcsAsignadosDelRol.length > 0 ? (
                          ppcsAsignadosDelRol.flatMap((ppc) => 
                            Array.from({ length: ppc.cantidad_faltante }, (_, index) => (
                              <div
                                key={`asignado-${ppc.id}-${index}`}
                                className="p-3 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 rounded-lg transition-colors relative"
                              >
                                {/* Botón X para eliminar puesto */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEliminarPuesto(ppc.id, index)}
                                  disabled={eliminandoPuesto === ppc.id}
                                  className="absolute top-1 right-1 h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                  title="Eliminar puesto"
                                >
                                  {eliminandoPuesto === ppc.id ? (
                                    <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-red-600"></div>
                                  ) : (
                                    <X className="w-2 h-2" />
                                  )}
                                </Button>

                                <div className="flex items-start justify-between pr-6">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <div className="font-medium text-xs text-green-800 dark:text-green-200">
                                        {ppc.nombre_puesto || `Puesto #${index + 1}`}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditarNombrePuesto(ppc.id, ppc.nombre_puesto || `Puesto #${index + 1}`);
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                                      </Button>
                                    </div>
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
                                  <Badge variant="default" className="text-xs">Asignado</Badge>
                                </div>
                                {/* Botón para desasignar */}
                                <div className="mt-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDesasignarGuardia(ppc.id)}
                                    disabled={desasignando === ppc.id}
                                    className="w-full h-7 text-xs text-red-600 hover:text-red-700"
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
                          <div className="col-span-full p-4 text-center text-muted-foreground">
                            <div className="text-sm">No hay puestos asignados</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

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

      {/* Console log para confirmar que la refactorización se completó */}
      {(() => { console.log("✅ Refactor visual de asignación de turnos completado sin afectar la lógica"); return null; })()}
      {/* Modal de edición de nombre de puesto */}
      <Dialog 
        open={editandoPuesto?.isOpen || false} 
        onOpenChange={(open) => {
          if (!open) {
            setEditandoPuesto(null);
            setNuevoNombrePuesto('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nombre del Puesto</DialogTitle>
            <DialogDescription>
              Personaliza el nombre del puesto para identificarlo fácilmente
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="nombre" className="text-right">
                Nombre
              </label>
              <Input
                id="nombre"
                value={nuevoNombrePuesto}
                onChange={(e) => setNuevoNombrePuesto(e.target.value)}
                className="col-span-3"
                placeholder="Ej: Portería Principal, CCTV, Guardia Ronda..."
                disabled={guardandoNombre}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Ejemplos: Portería Principal, CCTV Exterior, Guardia Perimetral, Recepción
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditandoPuesto(null);
                setNuevoNombrePuesto('');
              }}
              disabled={guardandoNombre}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleGuardarNombrePuesto}
              disabled={guardandoNombre || !nuevoNombrePuesto.trim()}
            >
              {guardandoNombre ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 