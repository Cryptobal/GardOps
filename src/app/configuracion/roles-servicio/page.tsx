'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useState, useEffect } from 'react';
import { useCan } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Save, X, Download, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { 
  getRolesServicio, 
  crearRolServicio, 
  actualizarRolServicio,
  getRolesServicioStats,
  inactivarRolServicioCompleto,
  reactivarRolServicio,
  verificarPautasRol,
  verificarGuardiasRol
} from '@/lib/api/roles-servicio';
import { RolServicio, CrearRolServicioData } from '@/lib/schemas/roles-servicio';
import { calcularNomenclaturaRol } from '@/lib/utils/calcularNomenclaturaRol';
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
  const { allowed } = useCan('config.roles_servicio.view');
  const { success, error } = useToast();
  const [roles, setRoles] = useState<RolServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [stats, setStats] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [rolParaConfirmar, setRolParaConfirmar] = useState<RolServicio | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoRol, setInfoRol] = useState<{rol: RolServicio, verificacion: any} | null>(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [showGuardiasDialog, setShowGuardiasDialog] = useState(false);
  const [guardiasRol, setGuardiasRol] = useState<{rol: RolServicio, verificacion: any} | null>(null);
  
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
    if (!allowed) return;
    cargarRoles();
    cargarStats();
  }, [allowed]);

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
      const rolesData = await getRolesServicio();
      setRoles(rolesData);
    } catch (err) {
      console.error('Error cargando roles:', err);
      error('No se pudieron cargar los roles de servicio', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const cargarStats = async () => {
    try {
      const statsData = await getRolesServicioStats();
      console.log('📊 Estadísticas cargadas:', statsData);
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
      
      await crearRolServicio(nuevoRol as CrearRolServicioData);
      
      success('Rol de servicio creado correctamente', 'Éxito');

      // Limpiar formulario
      setNuevoRol({
        dias_trabajo: 4,
        dias_descanso: 4,
        hora_inicio: '08:00',
        hora_termino: '20:00'
      });

      await cargarRoles();
      await cargarStats();
      setFormularioAbierto(false); // Cerrar el formulario después de crear exitosamente
    } catch (err) {
      console.error('Error creando rol:', err);
      error('No se pudo crear el rol', 'Error');
    } finally {
      setCreando(false);
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
    // Si está activo y queremos inactivar, verificar guardias primero
    if (rol.estado === 'Activo') {
      try {
        const verificacionGuardias = await verificarGuardiasRol(rol.id);
        
        if (verificacionGuardias.tiene_guardias) {
          // Mostrar modal informativo en lugar de confirmación
          setGuardiasRol({ rol, verificacion: verificacionGuardias });
          setShowGuardiasDialog(true);
          return;
        }
      } catch (err) {
        console.error('Error verificando guardias del rol:', err);
        error('Error al verificar si el rol puede ser inactivado', 'Error');
        return;
      }
    }
    
    // Si no tiene guardias o está inactivo, proceder normalmente
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

  const rolesFiltrados = roles.filter(rol => {
    if (filtroEstado === 'activos') return rol.estado === 'Activo';
    if (filtroEstado === 'inactivos') return rol.estado === 'Inactivo';
    return true;
  });

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Acceso denegado
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header con botón de volver */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => window.history.back()} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Roles de Servicio</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarRoles} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {console.log('🔍 Stats en render:', stats)}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <CardHeader className="pb-1 sm:pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Roles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-lg sm:text-2xl font-bold">
              {stats ? stats.total : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="p-3 sm:p-4">
          <CardHeader className="pb-1 sm:pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {stats ? stats.activos : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="p-3 sm:p-4">
          <CardHeader className="pb-1 sm:pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Inactivos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              {stats ? stats.inactivos : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="p-3 sm:p-4">
          <CardHeader className="pb-1 sm:pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Con Guardias</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {stats ? stats.conGuardias : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulario de Creación */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setFormularioAbierto(!formularioAbierto)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Crear Nuevo Rol de Servicio
            </CardTitle>
            <div className={`transform transition-transform duration-200 ${formularioAbierto ? 'rotate-45' : 'rotate-0'}`}>
              <Plus className="w-5 h-5" />
            </div>
          </div>
        </CardHeader>
        {formularioAbierto && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dias_trabajo">Días de Trabajo</Label>
                <Input
                  id="dias_trabajo"
                  type="number"
                  min="1"
                  value={nuevoRol.dias_trabajo}
                  onChange={(e) => setNuevoRol({...nuevoRol, dias_trabajo: parseInt(e.target.value) || 0})}
                  placeholder="4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dias_descanso">Días de Descanso</Label>
                <Input
                  id="dias_descanso"
                  type="number"
                  min="1"
                  value={nuevoRol.dias_descanso}
                  onChange={(e) => setNuevoRol({...nuevoRol, dias_descanso: parseInt(e.target.value) || 0})}
                  placeholder="4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_inicio">Hora de Inicio</Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={nuevoRol.hora_inicio}
                  onChange={(e) => setNuevoRol({...nuevoRol, hora_inicio: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_termino">Hora de Término</Label>
                <Input
                  id="hora_termino"
                  type="time"
                  value={nuevoRol.hora_termino}
                  onChange={(e) => setNuevoRol({...nuevoRol, hora_termino: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Calculado</Label>
                <Input
                  id="nombre"
                  value={nombreCalculado}
                  disabled
                  placeholder="Se calcula automáticamente"
                />
              </div>
            </div>
            
            {/* Nombre Calculado */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Label className="text-sm font-medium">Nombre Calculado:</Label>
              <div className="text-lg font-mono text-blue-600 dark:text-blue-400">
                {nombreCalculado}
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={handleCrearRol} disabled={creando}>
                {creando ? 'Creando...' : 'Crear Rol'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filtroEstado === 'todos' ? 'default' : 'outline'}
          onClick={() => setFiltroEstado('todos')}
          size="sm"
          className="flex-1 sm:flex-none"
        >
          <span className="hidden sm:inline">Todos</span>
          <span className="sm:hidden">Todos</span>
          <span className="ml-1">({roles.length})</span>
        </Button>
        <Button
          variant={filtroEstado === 'activos' ? 'default' : 'outline'}
          onClick={() => setFiltroEstado('activos')}
          size="sm"
          className="flex-1 sm:flex-none"
        >
          <span className="hidden sm:inline">Activos</span>
          <span className="sm:hidden">Activos</span>
          <span className="ml-1">({roles.filter(r => r.estado === 'Activo').length})</span>
        </Button>
        <Button
          variant={filtroEstado === 'inactivos' ? 'default' : 'outline'}
          onClick={() => setFiltroEstado('inactivos')}
          size="sm"
          className="flex-1 sm:flex-none"
        >
          <span className="hidden sm:inline">Inactivos</span>
          <span className="sm:hidden">Inactivos</span>
          <span className="ml-1">({roles.filter(r => r.estado === 'Inactivo').length})</span>
        </Button>
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
            <>
              {/* Vista de tabla para desktop */}
              <div className="hidden lg:block">
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
              </div>

              {/* Vista de tarjetas para móvil */}
              <div className="lg:hidden space-y-4">
                {rolesFiltrados.map((rol) => (
                  <Card key={rol.id} className="p-4">
                    <div className="space-y-3">
                      {/* Nombre */}
                      <div>
                        <h3 className="font-medium text-lg">{rol.nombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          {rol.nombre || 'Sin nombre'}
                        </p>
                      </div>

                      {/* Información del turno */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Turno:</span>
                          <div className="font-medium">
                            {rol.dias_trabajo}x{rol.dias_descanso}x{rol.horas_turno}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Horario:</span>
                          <div className="font-medium">
                            {rol.hora_inicio} - {rol.hora_termino}
                          </div>
                        </div>
                      </div>

                      {/* Estado */}
                      <div className="flex items-center justify-between">
                        <Badge variant={rol.estado === 'Activo' ? 'default' : 'secondary'}>
                          {rol.estado}
                        </Badge>
                        
                        {/* Acciones */}
                        <div className="flex gap-2">
                          {editando === rol.id ? (
                            <>
                              <Button size="sm" onClick={handleGuardarEdicion}>
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelarEdicion}>
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
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleActivarInactivar(rol)}
                                title={rol.estado === 'Activo' ? 'Inactivar rol' : 'Activar rol'}
                              >
                                {rol.estado === 'Activo' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
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

      {/* Modal de Guardias Asignados - Rol No Inactivable */}
      <AlertDialog open={showGuardiasDialog} onOpenChange={setShowGuardiasDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Rol No Inactivable
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                  El rol <strong>"{guardiasRol?.rol.nombre}"</strong> no puede ser inactivado.
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {guardiasRol?.verificacion.mensaje}
                </p>
              </div>

              {guardiasRol?.verificacion.guardias_info && guardiasRol.verificacion.guardias_info.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    👥 Guardias Asignados ({guardiasRol.verificacion.guardias_count}):
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {guardiasRol.verificacion.guardias_info.map((guardia: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-800 rounded border">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">
                          {guardia.nombre_completo}
                        </span>
                        <div className="flex gap-4 text-blue-600 dark:text-blue-400">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                            {guardia.instalacion_nombre}
                          </span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {guardia.nombre_puesto}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                  💡 ¿Por qué no se puede inactivar?
                </h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• El rol tiene guardias activos asignados</li>
                  <li>• Inactivar afectaría las asignaciones actuales</li>
                  <li>• Podría causar problemas en las pautas mensuales</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  ✅ Pasos para Inactivar:
                </h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• <strong>Desasignar guardias:</strong> Ve a Asignaciones y quita los guardias del rol</li>
                  <li>• <strong>Verificar pautas:</strong> Asegúrate de que no hay pautas activas</li>
                  <li>• <strong>Inactivar rol:</strong> Una vez sin guardias, podrás inactivarlo</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendido</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowGuardiasDialog(false);
                setGuardiasRol(null);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
