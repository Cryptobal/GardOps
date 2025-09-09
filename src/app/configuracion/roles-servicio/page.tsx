"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

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
      logger.debug('🔄 Cargando roles de servicio...');
      const rolesData = await getRolesServicio();
      devLogger.success(' Roles cargados:', rolesData.length, 'roles');
      
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
          logger.debug(`🔄 Cargando series para rol ${rol.nombre}...`);
          const response = await fetch(`/api/roles-servicio/${rol.id}/series`);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.series_dias) {
              nuevasSeriesPorRol.set(rol.id, result.data.series_dias);
              logger.debug(`✅ Series cargadas para ${rol.nombre}:`, result.data.series_dias.length);
            }
          }
        } catch (error) {
          console.error(`Error cargando series para rol ${rol.id}:`, error);
        }
      }
    }
    
    setSeriesPorRol(nuevasSeriesPorRol);
    devLogger.success(' Series cargadas para', nuevasSeriesPorRol.size, 'roles');
  };

  const cargarStats = async () => {
    try {
      const statsData = await getRolesServicioStats();
      setStats(statsData);
    } catch (err) {
      logger.error('Error cargando estadísticas::', err);
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
      devLogger.success(' Rol creado exitosamente:', nuevoRolCreado);
      
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
      //       logger.error('Error creando turno de noche automático::', err);
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

      logger.debug('🔄 Recargando roles después de crear...');
      await cargarRoles();
      await cargarStats();
      logger.debug('✅ Recarga completada');
    } catch (err) {
      logger.error('Error creando rol::', err);
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
      logger.debug(`🔄 Replicando rol ${rol.nombre} a ${tipoSimil}...`);
      
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
      logger.debug('🌙 Creando turno de noche:', datosNoche);
      
      await crearRolServicio(datosNoche as CrearRolServicioData);
      success('Turno de noche creado correctamente', 'Éxito');
      
      await cargarRoles();
      await cargarStats();
    } catch (err) {
      logger.error('Error creando turno de noche::', err);
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
  devLogger.search(' Filtros activos:', { filtroEstado, filtroPatron });
  devLogger.search(' Total roles:', roles.length, 'Roles filtrados:', rolesFiltrados.length);

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

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_roles || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.roles_activos || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.roles_inactivos || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Con Guardias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.roles_con_estructura || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botón de Creación Moderno */}
      <Card className="mb-6">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Crear Nuevo Rol de Servicio</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Configura horarios personalizados para cada día del ciclo de trabajo
              </p>
            </div>
            <Button 
              onClick={() => setShowWizardCrear(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-base font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear Rol de Servicio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros en una línea */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Filtros de Estado */}
        <div className="flex gap-1">
          <Button
            variant={filtroEstado === 'todos' ? 'default' : 'outline'}
            onClick={() => setFiltroEstado('todos')}
            size="sm"
          >
            Todos ({roles.length})
          </Button>
          <Button
            variant={filtroEstado === 'activos' ? 'default' : 'outline'}
            onClick={() => setFiltroEstado('activos')}
            size="sm"
          >
            Activos ({roles.filter(r => r.estado === 'Activo').length})
          </Button>
          <Button
            variant={filtroEstado === 'inactivos' ? 'default' : 'outline'}
            onClick={() => setFiltroEstado('inactivos')}
            size="sm"
          >
            Inactivos ({roles.filter(r => r.estado === 'Inactivo').length})
          </Button>
        </div>

        {/* Separador */}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>

        {/* Filtros de Patrón */}
        {patronesDisponibles.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={filtroPatron === 'todos' ? 'default' : 'outline'}
              onClick={() => setFiltroPatron('todos')}
              size="sm"
            >
              Todos los Patrones
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
                >
                  {patron} ({count})
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabla de Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Roles de Servicio ({rolesFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando roles...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Horas/Sem</TableHead>
                  <TableHead>Jornada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesFiltrados.map((rol) => (
                  <TableRow key={rol.id}>
                    <TableCell>
                      <div className="font-medium">{rol.nombre}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {rol.nombre || 'Sin descripción'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {rol.dias_trabajo}x{rol.dias_descanso}x{rol.horas_turno}
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm">
                          {(() => {
                            // Obtener series específicas de este rol
                            const seriesDelRol = seriesPorRol.get(rol.id) || [];
                            const infoJornada = obtenerInfoJornada(rol, seriesDelRol);
                            
                            if (infoJornada.resumenHorario.esVariable) {
                              // Generar contenido específico con horarios reales
                              const contenidoEspecifico = seriesDelRol.length > 0 ? 
                                seriesDelRol
                                  .filter(s => s.es_dia_trabajo)
                                  .map(s => {
                                    const nombreDia = s.posicion_en_ciclo === 1 ? 'Lunes' :
                                                     s.posicion_en_ciclo === 2 ? 'Martes' :
                                                     s.posicion_en_ciclo === 3 ? 'Miércoles' :
                                                     s.posicion_en_ciclo === 4 ? 'Jueves' :
                                                     s.posicion_en_ciclo === 5 ? 'Viernes' :
                                                     s.posicion_en_ciclo === 6 ? 'Sábado' :
                                                     s.posicion_en_ciclo === 7 ? 'Domingo' :
                                                     `Día ${s.posicion_en_ciclo}`;
                                    return `${nombreDia}: ${s.hora_inicio?.slice(0,5)} - ${s.hora_termino?.slice(0,5)}`;
                                  }) :
                                [
                                  'Este rol tiene horarios personalizados',
                                  'Cada día del ciclo puede ser diferente',
                                  `Promedio: ${rol.horas_turno}h por día de trabajo`
                                ];
                              
                              return (
                                <TooltipSimple
                                  titulo="Horarios Variables"
                                  contenido={contenidoEspecifico}
                                  esVariable={true}
                                >
                                  <span className="flex items-center gap-1">
                                    {infoJornada.resumenHorario.texto}
                                    <span className="text-blue-500 text-xs">*</span>
                                    <Clock className="h-3 w-3 text-blue-400 ml-1" />
                                  </span>
                                </TooltipSimple>
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
                    
                    {/* Nueva columna: Horas Semanales */}
                    <TableCell>
                      {(() => {
                        const seriesDelRol = seriesPorRol.get(rol.id) || [];
                        const infoJornada = obtenerInfoJornada(rol, seriesDelRol);
                        return (
                          <div className="text-sm">
                            <div className="font-medium">{infoJornada.horasSemanales}h</div>
                            {infoJornada.requiereColacion && (
                              <div className="text-xs text-gray-500">
                                ({infoJornada.horasConColacion}h + colación)
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    
                    {/* Nueva columna: Tipo de Jornada */}
                    <TableCell>
                      {(() => {
                        const seriesDelRol = seriesPorRol.get(rol.id) || [];
                        const infoJornada = obtenerInfoJornada(rol, seriesDelRol);
                        return (
                          <Badge 
                            variant={
                              infoJornada.colorIndicador === 'green' ? 'default' :
                              infoJornada.colorIndicador === 'orange' ? 'secondary' : 'destructive'
                            }
                            title={infoJornada.descripcion}
                            className={
                              infoJornada.colorIndicador === 'green' ? 'bg-green-100 text-green-800' :
                              infoJornada.colorIndicador === 'orange' ? 'bg-orange-100 text-orange-800' : 
                              'bg-red-100 text-red-800'
                            }
                          >
                            {infoJornada.tipoJornada}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={rol.estado === 'Activo' ? 'default' : 'secondary'}>
                        {rol.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* Botón de editar eliminado - roles no se pueden editar una vez creados */}
                        <div></div>
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
                                    className="text-purple-600 hover:text-purple-700"
                                  >
                                    {rolAnalizado.tipoSimil === 'nocturno' ? (
                                      <Moon className="w-4 h-4" />
                                    ) : (
                                      <Sun className="w-4 h-4" />
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
                            >
                              {rol.estado === 'Activo' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
