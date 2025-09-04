'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Save, X, Download, Eye, EyeOff, AlertCircle, ChevronDown, ChevronUp, Moon, Calendar } from 'lucide-react';
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
import WizardCrearRolSimple from '@/components/roles-servicio/WizardCrearRolSimple';
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
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
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

  const [editData, setEditData] = useState<CrearRolServicioData>({
    dias_trabajo: 4,
    dias_descanso: 4,
    hora_inicio: '08:00',
    hora_termino: '20:00',
    estado: 'Activo'
  });

  // Calcular nombre automáticamente
  const [nombreCalculado, setNombreCalculado] = useState('');
  const [nombreCalculadoEdit, setNombreCalculadoEdit] = useState('');

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

  useEffect(() => {
    try {
      const nombre = calcularNomenclaturaRol(
        editData.dias_trabajo,
        editData.dias_descanso,
        editData.hora_inicio,
        editData.hora_termino
      );
      setNombreCalculadoEdit(nombre);
    } catch (err) {
      setNombreCalculadoEdit('Error en cálculo');
    }
  }, [editData]);

  const cargarRoles = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando roles de servicio...');
      const rolesData = await getRolesServicio();
      console.log('✅ Roles cargados:', rolesData.length, 'roles');
      console.log('📋 IDs de roles:', rolesData.map(r => ({ id: r.id, nombre: r.nombre })));
      setRoles(rolesData);
    } catch (err) {
      console.error('❌ Error cargando roles:', err);
      error('No se pudieron cargar los roles de servicio', 'Error');
    } finally {
      setLoading(false);
    }
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

  const handleEditar = async (rol: RolServicio) => {
    try {
      // Verificar si el rol tiene pautas asociadas
      const verificacionPautas = await verificarPautasRol(rol.id);
      
      if (verificacionPautas.tiene_pautas) {
        // Mostrar modal informativo en lugar de error
        setInfoRol({ rol, verificacion: verificacionPautas });
        setShowInfoDialog(true);
        return;
      }

      setEditData({
        dias_trabajo: rol.dias_trabajo,
        dias_descanso: rol.dias_descanso,
        hora_inicio: rol.hora_inicio,
        hora_termino: rol.hora_termino,
        estado: rol.estado
      });
      setEditando(rol.id);
    } catch (err) {
      console.error('Error verificando pautas del rol:', err);
      error('Error al verificar si el rol puede ser editado', 'Error');
    }
  };

  const handleGuardarEdicion = async () => {
    if (!editando) return;

    try {
      // Verificar si ya existe un rol con el mismo nombre (excluyendo el actual)
      const nombreCalculado = calcularNomenclaturaRol(
        editData.dias_trabajo,
        editData.dias_descanso,
        editData.hora_inicio,
        editData.hora_termino
      );
      
      const rolExistente = roles.find(rol => 
        rol.nombre === nombreCalculado && rol.id !== editando
      );
      if (rolExistente) {
        error(`Ya existe un rol de servicio con el nombre: ${nombreCalculado}`, 'Error');
        return;
      }

      await actualizarRolServicio(editando, editData);
      success('Rol de servicio actualizado correctamente', 'Éxito');
      setEditando(null);
      await cargarRoles();
    } catch (err) {
      console.error('Error actualizando rol:', err);
      error(err instanceof Error ? err.message : 'No se pudo actualizar el rol', 'Error');
    }
  };

  const handleCancelarEdicion = () => {
    setEditando(null);
  };

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
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesFiltrados.map((rol) => (
                  <TableRow key={rol.id}>
                    <TableCell>
                      {editando === rol.id ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-blue-600">Nombre Calculado:</div>
                          <div className="text-sm font-mono">{nombreCalculadoEdit}</div>
                        </div>
                      ) : (
                        <div className="font-medium">{rol.nombre}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editando === rol.id ? (
                        <div className="text-sm text-muted-foreground">
                          {nombreCalculadoEdit || 'Sin nombre'}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {rol.nombre || 'Sin nombre'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editando === rol.id ? (
                        <div className="space-y-2">
                          <Input
                            type="number"
                            min="1"
                            value={editData.dias_trabajo}
                            onChange={(e) => setEditData({...editData, dias_trabajo: parseInt(e.target.value) || 0})}
                            className="w-16"
                          />
                          <span className="text-sm">x</span>
                          <Input
                            type="number"
                            min="1"
                            value={editData.dias_descanso}
                            onChange={(e) => setEditData({...editData, dias_descanso: parseInt(e.target.value) || 0})}
                            className="w-16"
                          />
                        </div>
                      ) : (
                        <div className="text-sm">
                          {rol.dias_trabajo}x{rol.dias_descanso}x{rol.horas_turno}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editando === rol.id ? (
                        <div className="space-y-2">
                          <Input
                            type="time"
                            value={editData.hora_inicio}
                            onChange={(e) => setEditData({...editData, hora_inicio: e.target.value})}
                            className="w-24"
                          />
                          <span className="text-sm">-</span>
                          <Input
                            type="time"
                            value={editData.hora_termino}
                            onChange={(e) => setEditData({...editData, hora_termino: e.target.value})}
                            className="w-24"
                          />
                        </div>
                      ) : (
                        <div className="text-sm">
                          {rol.hora_inicio} - {rol.hora_termino}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rol.estado === 'Activo' ? 'default' : 'secondary'}>
                        {rol.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {editando === rol.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={handleGuardarEdicion}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelarEdicion}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditar(rol)}
                              title="Editar rol"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {/* Temporalmente deshabilitado para debugging */}
                            {/* {!tieneParNoche(rol, roles) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => crearTurnoNoche(rol)}
                                title="Crear turno de noche"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Moon className="w-4 h-4" />
                              </Button>
                            )} */}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleActivarInactivar(rol)}
                              title={rol.estado === 'Activo' ? 'Inactivar rol' : 'Activar rol'}
                            >
                              {rol.estado === 'Activo' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </>
                        )}
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
      <WizardCrearRolSimple
        isOpen={showWizardCrear}
        onClose={() => setShowWizardCrear(false)}
        onSave={handleCrearRolWizard}
      />
    </div>
  );
}
