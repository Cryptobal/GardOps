'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Save, X, Download, Eye, EyeOff, AlertCircle, ChevronDown, ChevronUp, Moon, Sun, Calendar, Clock } from 'lucide-react';
import { 
  getRolesServicio, 
  crearRolServicio, 
  actualizarRolServicio,
  getRolesServicioStats,
  inactivarRolServicioCompleto,
  reactivarRolServicio,
  verificarPautasRol
} from '@/lib/api/roles-servicio';
import { RolServicio, CrearRolServicioData } from '@/lib/schemas/roles-servicio';
import { calcularNomenclaturaRol } from '@/lib/utils/calcularNomenclaturaRol';
import { ordenarRolesPorPatron, extraerPatronesUnicos, filtrarRolesPorPatron, extraerPatronTurno, tieneParNoche, crearDatosTurnoNoche } from '@/lib/utils/ordenarRolesPorPatron';
import { analizarTodosLosRoles, crearDatosReplicacion } from '@/lib/utils/detectar-similes-roles';
import { obtenerInfoJornada } from '@/lib/utils/calcular-horas-semanales';
import WizardSeriesTurnosV2 from '@/components/roles-servicio/WizardSeriesTurnosV2';
import { TooltipSimple } from '@/components/ui/tooltip-simple';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function RolesServicioPage() {
  const { success, error } = useToast();
  const [roles, setRoles] = useState<RolServicio[]>([]);
  const [seriesPorRol, setSeriesPorRol] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  // Edición eliminada - roles no se pueden editar
  const [creando, setCreando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [filtroPatron, setFiltroPatron] = useState<string>('todos');
  const [stats, setStats] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [rolParaConfirmar, setRolParaConfirmar] = useState<RolServicio | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoRol, setInfoRol] = useState<{rol: RolServicio, verificacion: any} | null>(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [showWizardCrear, setShowWizardCrear] = useState(false);
  
  const [nuevoRol, setNuevoRol] = useState({
    dias_trabajo: 4,
    dias_descanso: 4,
    hora_inicio: '08:00',
    hora_termino: '20:00'
  });

  // Estados de edición eliminados
  // const [editData, setEditData] = useState<CrearRolServicioData>({
  //   dias_trabajo: 4,
  //   dias_descanso: 4,
  //   hora_inicio: '08:00',
  //   hora_termino: '20:00',
  //   estado: 'Activo'
  // });

  // Calcular nombre automáticamente
  const [nombreCalculado, setNombreCalculado] = useState('');

  useEffect(() => {
    cargarRoles();
    cargarStats();
  }, []);

  useEffect(() => {
    try {
      const nombre = calcularNomenclaturaRol(
        nuevoRol.dias_trabajo,
        nuevoRol.dias_descanso,
        nuevoRol.hora_inicio,
        nuevoRol.hora_termino
      );
      setNombreCalculado(nombre);
    } catch (err) {
      setNombreCalculado('Error en cálculo');
    }
  }, [nuevoRol]);

  // useEffect de edición eliminado

  const cargarRoles = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando roles de servicio...');
      const rolesData = await getRolesServicio();
      console.log('✅ Roles cargados:', rolesData.length, 'roles');
      
      const rolesOrdenados = ordenarRolesPorPatron(rolesData);
      setRoles(rolesOrdenados);
      
      // Cargar series de días para roles con horarios variables
      await cargarSeriesDias(rolesOrdenados);
      
    } catch (err) {
      console.error('❌ Error cargando roles:', err);
      error('No se pudieron cargar los roles de servicio', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const cargarSeriesDias = async (roles: RolServicio[]) => {
    const nuevasSeriesPorRol = new Map<string, any[]>();
    
    for (const rol of roles) {
      if (rol.tiene_horarios_variables) {
        try {
          console.log(`🔄 Cargando series para rol ${rol.nombre}...`);
          const response = await fetch(`/api/roles-servicio/${rol.id}/series`);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.series_dias) {
              nuevasSeriesPorRol.set(rol.id, result.data.series_dias);
              console.log(`✅ Series cargadas para ${rol.nombre}:`, result.data.series_dias.length);
            }
          }
        } catch (error) {
          console.error(`Error cargando series para rol ${rol.id}:`, error);
        }
      }
    }
    
    setSeriesPorRol(nuevasSeriesPorRol);
    console.log('✅ Series cargadas para', nuevasSeriesPorRol.size, 'roles');
  };

  const cargarStats = async () => {
    try {
      const statsData = await getRolesServicioStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const handleCrearRol = async () => {
    try {
      setCreando(true);
      
      // Verificar si ya existe un rol con el mismo nombre
      const nombreCalculado = calcularNomenclaturaRol(
        nuevoRol.dias_trabajo,
        nuevoRol.dias_descanso,
        nuevoRol.hora_inicio,
        nuevoRol.hora_termino
      );
      
      const rolExistente = roles.find(rol => rol.nombre === nombreCalculado);
      if (rolExistente) {
        error(`Ya existe un rol de servicio con el nombre: ${nombreCalculado}`, 'Error');
        return;
      }
      
      const nuevoRolCreado = await crearRolServicio(nuevoRol as CrearRolServicioData);
      console.log('✅ Rol creado exitosamente:', nuevoRolCreado);
      
      success('Rol de servicio creado correctamente', 'Éxito');

      // Temporalmente deshabilitado para debugging
      // Preguntar si quiere crear el turno de noche
      // const info = extraerPatronTurno(nuevoRolCreado.nombre);
      // const esTurnoDia = info.esDia;
      // 
      // if (esTurnoDia) {
      //   const crearNoche = confirm(
      //     `¿Quieres crear también el turno de noche para el patrón ${info.patron}?\n\n` +
      //     `Esto creará automáticamente el turno de noche con horario de 12 horas después.`
      //   );
      //   
      //   if (crearNoche) {
      //     try {
      //       const datosNoche = crearDatosTurnoNoche(nuevoRolCreado);
      //       await crearRolServicio(datosNoche as CrearRolServicioData);
      //       success('Turno de noche creado automáticamente', 'Éxito');
      //     } catch (err) {
      //       console.error('Error creando turno de noche automático:', err);
      //       // No mostrar error, solo log
      //     }
      //   }
      // }

      // Limpiar formulario y cerrar
      setNuevoRol({
        dias_trabajo: 4,
        dias_descanso: 4,
        hora_inicio: '08:00',
        hora_termino: '20:00'
      });
      setFormularioAbierto(false);

      console.log('🔄 Recargando roles después de crear...');
      await cargarRoles();
      await cargarStats();
      console.log('✅ Recarga completada');
    } catch (err) {
      console.error('Error creando rol:', err);
      error('No se pudo crear el rol', 'Error');
    } finally {
      setCreando(false);
    }
  };

  const handleCrearRolWizard = async (rolData: any) => {
    try {
      setLoading(true);
      await crearRolServicio(rolData);
      success('Rol de servicio creado exitosamente');
      setShowWizardCrear(false);
      cargarRoles();
      cargarStats();
    } catch (err: any) {
      error(err.message || 'Error al crear rol de servicio');
      throw err; // Re-throw para que el wizard maneje el error
    } finally {
      setLoading(false);
    }
  };

  const handleReplicarRol = async (rol: RolServicio, tipoSimil: 'diurno' | 'nocturno') => {
    try {
      setLoading(true);
      console.log(`🔄 Replicando rol ${rol.nombre} a ${tipoSimil}...`);
      
      const datosReplicacion = crearDatosReplicacion(rol);
      
      await crearRolServicio(datosReplicacion);
      
      success(`Rol ${tipoSimil} creado exitosamente`, 'Replicación Completada');
      
      cargarRoles();
      cargarStats();
    } catch (err: any) {
      error(err.message || `Error al crear rol ${tipoSimil}`, 'Error de Replicación');
    } finally {
      setLoading(false);
    }
  };

  // Función eliminada

  // Función eliminada

  // Función eliminada

  const handleActivarInactivar = async (rol: RolServicio) => {
    setRolParaConfirmar(rol);
    setShowConfirmDialog(true);
  };

  const confirmarAccion = async () => {
    if (!rolParaConfirmar) return;

    const accion = rolParaConfirmar.estado === 'Activo' ? 'inactivar' : 'activar';

    try {
      if (rolParaConfirmar.estado === 'Activo') {
        await inactivarRolServicioCompleto(rolParaConfirmar.id);
        success('Rol inactivado correctamente', 'Éxito');
      } else {
        await reactivarRolServicio(rolParaConfirmar.id);
        success('Rol activado correctamente', 'Éxito');
      }
      await cargarRoles();
      await cargarStats();
    } catch (err) {
      console.error(`Error ${accion}ando rol:`, err);
      error(`No se pudo ${accion} el rol`, 'Error');
    } finally {
      setShowConfirmDialog(false);
      setRolParaConfirmar(null);
    }
  };

  const crearTurnoNoche = async (rolDia: RolServicio) => {
    try {
      const datosNoche = crearDatosTurnoNoche(rolDia);
      console.log('🌙 Creando turno de noche:', datosNoche);
      
      await crearRolServicio(datosNoche as CrearRolServicioData);
      success('Turno de noche creado correctamente', 'Éxito');
      
      await cargarRoles();
      await cargarStats();
    } catch (err) {
      console.error('Error creando turno de noche:', err);
      error('No se pudo crear el turno de noche', 'Error');
    }
  };

  const exportarRoles = () => {
    const rolesFiltrados = roles.filter(rol => {
      if (filtroEstado === 'activos') return rol.estado === 'Activo';
      if (filtroEstado === 'inactivos') return rol.estado === 'Inactivo';
      return true;
    });

    const csvContent = [
      ['ID', 'Nombre', 'Descripción', 'Días Trabajo', 'Días Descanso', 'Horas Turno', 'Hora Inicio', 'Hora Término', 'Estado', 'Creado'],
      ...rolesFiltrados.map(rol => [
        rol.id,
        rol.nombre,
        rol.nombre || '',
        rol.dias_trabajo,
        rol.dias_descanso,
        rol.horas_turno,
        rol.hora_inicio,
        rol.hora_termino,
        rol.estado,
        new Date(rol.created_at).toLocaleDateString('es-CL')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `roles_servicio_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extraer patrones únicos para el filtro
  const patronesDisponibles = extraerPatronesUnicos(roles);
  
  // Temporalmente deshabilitar ordenamiento para debugging
  const rolesFiltrados = filtrarRolesPorPatron(
    roles.filter(rol => {
      if (filtroEstado === 'activos') return rol.estado === 'Activo';
      if (filtroEstado === 'inactivos') return rol.estado === 'Inactivo';
      return true;
    }),
    filtroPatron
  );
  
  // TODO: Rehabilitar ordenamiento cuando se resuelva el problema
  // const rolesFiltrados = ordenarRolesPorPatron(filtrarRolesPorPatron(...));

  // Debug: Log de filtros
  console.log('🔍 Filtros activos:', { filtroEstado, filtroPatron });
  console.log('🔍 Total roles:', roles.length, 'Roles filtrados:', rolesFiltrados.length);
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Roles de Servicio</h1>
        <div className="flex gap-2">
          <Button onClick={cargarRoles} variant="outline" disabled={loading}>
            {loading ? 'Cargando...' : 'Recargar'}
          </Button>
          <Button onClick={exportarRoles} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas - Monitor First: Single Row */}
      {stats && (
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <div className="flex-1 min-w-[120px] bg-white dark:bg-gray-800 rounded-lg border p-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Roles</div>
            <div className="text-xl font-bold">{stats.total_roles || 0}</div>
          </div>
          <div className="flex-1 min-w-[120px] bg-white dark:bg-gray-800 rounded-lg border p-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Activos</div>
            <div className="text-xl font-bold text-green-600">{stats.roles_activos || 0}</div>
          </div>
          <div className="flex-1 min-w-[120px] bg-white dark:bg-gray-800 rounded-lg border p-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Inactivos</div>
            <div className="text-xl font-bold text-red-600">{stats.roles_inactivos || 0}</div>
          </div>
          <div className="flex-1 min-w-[120px] bg-white dark:bg-gray-800 rounded-lg border p-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Con Guardias</div>
            <div className="text-xl font-bold text-blue-600">{stats.roles_con_estructura || 0}</div>
          </div>
        </div>
      )}

      {/* Botón de Creación Minimalista - Monitor First */}
      <div className="flex justify-end mb-4">
        <Button 
          onClick={() => setShowWizardCrear(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Rol
        </Button>
      </div>

      {/* Filtros - Monitor First: Compact Layout */}
      <div className="space-y-2">
        {/* Filtros de Estado - Compact */}
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={filtroEstado === 'todos' ? 'default' : 'outline'}
            onClick={() => setFiltroEstado('todos')}
            size="sm"
            className="text-xs"
          >
            Todos ({roles.length})
          </Button>
          <Button
            variant={filtroEstado === 'activos' ? 'default' : 'outline'}
            onClick={() => setFiltroEstado('activos')}
            size="sm"
            className="text-xs"
          >
            Activos ({roles.filter(r => r.estado === 'Activo').length})
          </Button>
          <Button
            variant={filtroEstado === 'inactivos' ? 'default' : 'outline'}
            onClick={() => setFiltroEstado('inactivos')}
            size="sm"
            className="text-xs"
          >
            Inactivos ({roles.filter(r => r.estado === 'Inactivo').length})
          </Button>
        </div>

        {/* Filtros de Patrón - Compact */}
        {patronesDisponibles.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={filtroPatron === 'todos' ? 'default' : 'outline'}
              onClick={() => setFiltroPatron('todos')}
              size="sm"
              className="text-xs"
            >
              Todos
            </Button>
            {patronesDisponibles.map(patron => {
              const count = roles.filter(rol => {
                const info = extraerPatronTurno(rol.nombre);
                return info.patron === patron;
              }).length;
              
              return (
                <Button
                  key={patron}
                  variant={filtroPatron === patron ? 'default' : 'outline'}
                  onClick={() => setFiltroPatron(patron)}
                  size="sm"
                  className="text-xs"
                >
                  {patron} ({count})
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabla de Roles - Monitor First */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Roles de Servicio ({rolesFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8">Cargando roles...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Descripción</TableHead>
                    <TableHead className="text-xs">Turno</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Horario</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Horas/Sem</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Jornada</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolesFiltrados.map((rol) => (
                    <TableRow key={rol.id}>
                      <TableCell className="py-2">
                        <div className="font-medium text-sm">{rol.nombre}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {rol.dias_trabajo}x{rol.dias_descanso}x{rol.horas_turno}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell">
                        <div className="text-xs text-muted-foreground">
                          {rol.nombre || 'Sin descripción'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="text-xs">
                          {rol.dias_trabajo}x{rol.dias_descanso}x{rol.horas_turno}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell">
                        <div className="text-xs">
                          {(() => {
                            // Obtener series específicas de este rol
                            const seriesDelRol = seriesPorRol.get(rol.id) || [];
                            const infoJornada = obtenerInfoJornada(rol, seriesDelRol);
                            
                            if (infoJornada.resumenHorario.esVariable) {
                              return (
                                <span className="flex items-center gap-1">
                                  {infoJornada.resumenHorario.texto}
                                  <Clock className="h-3 w-3 text-blue-400" />
                                </span>
                              );
                            }
                            
                            return (
                              <span>
                                {infoJornada.resumenHorario.texto}
                              </span>
                            );
                          })()}
                        </div>
                      </TableCell>
                    
                      {/* Horas Semanales - Hidden on small screens */}
                      <TableCell className="py-2 hidden lg:table-cell">
                        {(() => {
                          const seriesDelRol = seriesPorRol.get(rol.id) || [];
                          const infoJornada = obtenerInfoJornada(rol, seriesDelRol);
                          return (
                            <div className="text-xs">
                              <div className="font-medium">{infoJornada.horasSemanales}h</div>
                              {infoJornada.requiereColacion && (
                                <div className="text-xs text-gray-500">
                                  +colación
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      
                      {/* Tipo de Jornada - Hidden on small screens */}
                      <TableCell className="py-2 hidden lg:table-cell">
                        {(() => {
                          const seriesDelRol = seriesPorRol.get(rol.id) || [];
                          const infoJornada = obtenerInfoJornada(rol, seriesDelRol);
                          return (
                            <Badge 
                              variant={
                                infoJornada.colorIndicador === 'green' ? 'default' :
                                infoJornada.colorIndicador === 'orange' ? 'secondary' : 'destructive'
                              }
                              className="text-xs"
                            >
                              {infoJornada.tipoJornada}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      
                      <TableCell className="py-2">
                        <Badge 
                          variant={rol.estado === 'Activo' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {rol.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                          {/* Botón de replicación inteligente */}
                          {(() => {
                            const analisis = analizarTodosLosRoles(roles);
                            const rolAnalizado = analisis.find(r => r.rol.id === rol.id);
                            
                            if (rolAnalizado && !rolAnalizado.tieneSimil && rolAnalizado.tipoSimil) {
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReplicarRol(rol, rolAnalizado.tipoSimil!)}
                                  title={`Crear turno ${rolAnalizado.tipoSimil}`}
                                  className="text-purple-600 hover:text-purple-700 p-1 h-6 w-6"
                                >
                                  {rolAnalizado.tipoSimil === 'nocturno' ? (
                                    <Moon className="w-3 h-3" />
                                  ) : (
                                    <Sun className="w-3 h-3" />
                                  )}
                                </Button>
                              );
                            }
                            return null;
                          })()}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleActivarInactivar(rol)}
                            title={rol.estado === 'Activo' ? 'Inactivar rol' : 'Activar rol'}
                            className="p-1 h-6 w-6"
                          >
                            {rol.estado === 'Activo' ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {rolParaConfirmar?.estado === 'Activo' ? 'Inactivar Rol' : 'Activar Rol'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres {rolParaConfirmar?.estado === 'Activo' ? 'inactivar' : 'activar'} el rol "{rolParaConfirmar?.nombre}"?
              {rolParaConfirmar?.estado === 'Activo' && (
                <span className="block mt-2 text-red-600 font-medium">
                  ⚠️ Esta acción inactivará el rol y no podrá ser asignado a nuevas guardias.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAccion}>
              {rolParaConfirmar?.estado === 'Activo' ? 'Inactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Informativo - Rol No Editable */}
      <AlertDialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Rol No Editable
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                  El rol <strong>"{infoRol?.rol.nombre}"</strong> no puede ser editado.
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {infoRol?.verificacion.mensaje}
                </p>
              </div>

              {infoRol?.verificacion.pautas_info && infoRol.verificacion.pautas_info.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    📋 Pautas Mensuales Asociadas:
                  </h4>
                  <div className="space-y-2">
                    {infoRol.verificacion.pautas_info.map((pauta: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 dark:text-blue-300">
                          {pauta.instalacion_nombre}
                        </span>
                        <div className="flex gap-4 text-blue-600 dark:text-blue-400">
                          <span>{pauta.anio}/{pauta.mes.toString().padStart(2, '0')}</span>
                          <span>{pauta.dias_asignados} días</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                  💡 ¿Por qué no se puede editar?
                </h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• El rol ya tiene pautas mensuales generadas</li>
                  <li>• Modificar el rol afectaría datos históricos</li>
                  <li>• Podría causar inconsistencias en las pautas existentes</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  ✅ Alternativas Disponibles:
                </h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• <strong>Activar/Inactivar:</strong> Puedes cambiar el estado del rol</li>
                  <li>• <strong>Crear nuevo rol:</strong> Si necesitas cambios, crea un nuevo rol</li>
                  <li>• <strong>Mantener histórico:</strong> Los datos existentes se preservan</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendido</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowInfoDialog(false);
                setInfoRol(null);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Wizard para crear rol */}
      <WizardSeriesTurnosV2
        isOpen={showWizardCrear}
        onClose={() => setShowWizardCrear(false)}
        onSave={handleCrearRolWizard}
      />
    </div>
  );
}
