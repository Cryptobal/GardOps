'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Save, X, Trash2, RotateCcw, Download, Eye, EyeOff } from 'lucide-react';
import { 
  getRolesServicio, 
  crearRolServicio, 
  actualizarRolServicio,
  eliminarRolServicio,
  toggleRolServicioActivo,
  getRolesServicioStats,
  inactivarRolServicioCompleto,
  reactivarRolServicio
} from '@/lib/api/roles-servicio';
import { RolServicio, CrearRolServicioData } from '@/lib/schemas/roles-servicio';

export default function RolesServicioPage() {
  const { success, error } = useToast();
  const [roles, setRoles] = useState<RolServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [stats, setStats] = useState<any>(null);
  
  const [formData, setFormData] = useState<CrearRolServicioData>({
    nombre: '',
    descripcion: '',
    activo: true
  });

  const [editData, setEditData] = useState<CrearRolServicioData>({
    nombre: '',
    descripcion: '',
    activo: true
  });

  useEffect(() => {
    cargarRoles();
    cargarStats();
  }, []);

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
      setStats(statsData);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const handleCrearRol = async () => {
    if (!formData.nombre.trim()) {
      error('El nombre del rol es requerido', 'Error');
      return;
    }

    try {
      setCreando(true);
      await crearRolServicio(formData);
      
      success('Rol de servicio creado correctamente', 'Éxito');

      // Limpiar formulario
      setFormData({
        nombre: '',
        descripcion: '',
        activo: true
      });

      await cargarRoles();
      await cargarStats();
    } catch (err) {
      console.error('Error creando rol:', err);
      error(err instanceof Error ? err.message : 'No se pudo crear el rol', 'Error');
    } finally {
      setCreando(false);
    }
  };

  const handleEditar = (rol: RolServicio) => {
    setEditando(rol.id);
    setEditData({
      nombre: rol.nombre,
      descripcion: rol.descripcion || '',
      activo: rol.activo
    });
  };

  const handleGuardarEdicion = async () => {
    if (!editando || !editData.nombre.trim()) {
      error('El nombre del rol es requerido', 'Error');
      return;
    }

    try {
      await actualizarRolServicio(editando, editData);
      success('Rol de servicio actualizado correctamente', 'Éxito');
      setEditando(null);
      await cargarRoles();
      await cargarStats();
    } catch (err) {
      console.error('Error actualizando rol:', err);
      error(err instanceof Error ? err.message : 'No se pudo actualizar el rol', 'Error');
    }
  };

  const handleCancelarEdicion = () => {
    setEditando(null);
  };

  const handleEliminarRol = async (rol: RolServicio) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el rol "${rol.nombre}"?`)) {
      return;
    }

    try {
      await eliminarRolServicio(rol.id);
      success('Rol de servicio eliminado correctamente', 'Éxito');
      await cargarRoles();
      await cargarStats();
    } catch (err) {
      console.error('Error eliminando rol:', err);
      error(err instanceof Error ? err.message : 'No se pudo eliminar el rol', 'Error');
    }
  };

  const handleToggleActivo = async (rol: RolServicio) => {
    try {
      await toggleRolServicioActivo(rol.id, !rol.activo);
      const action = rol.activo ? 'inactivado' : 'activado';
      success(`Rol de servicio ${action} correctamente`, 'Éxito');
      await cargarRoles();
      await cargarStats();
    } catch (err) {
      console.error('Error cambiando estado del rol:', err);
      error(err instanceof Error ? err.message : 'No se pudo cambiar el estado del rol', 'Error');
    }
  };

  // Nueva función para inactivación completa (con liberación de estructuras)
  const handleInactivarCompleto = async (rol: RolServicio) => {
    const motivo = prompt('Ingrese el motivo de la inactivación (opcional):');
    
    try {
      const resultado = await inactivarRolServicioCompleto(rol.id, motivo || undefined);
      
      success(
        `Rol inactivado completamente. ${resultado.guardias_liberados} guardias liberados.`, 
        'Éxito'
      );
      
      await cargarRoles();
      await cargarStats();
    } catch (err) {
      console.error('Error inactivando rol completamente:', err);
      error(err instanceof Error ? err.message : 'No se pudo inactivar el rol completamente', 'Error');
    }
  };

  // Nueva función para reactivar rol
  const handleReactivar = async (rol: RolServicio) => {
    try {
      await reactivarRolServicio(rol.id);
      success('Rol de servicio reactivado correctamente', 'Éxito');
      await cargarRoles();
      await cargarStats();
    } catch (err) {
      console.error('Error reactivando rol:', err);
      error(err instanceof Error ? err.message : 'No se pudo reactivar el rol', 'Error');
    }
  };

  const exportarRoles = () => {
    const headers = ['Nombre', 'Descripción', 'Estado', 'Creado', 'Actualizado'];
    const csvContent = [
      headers.join(','),
      ...rolesFiltrados.map(rol => [
        `"${rol.nombre}"`,
        `"${rol.descripcion || ''}"`,
        rol.activo ? 'Activo' : 'Inactivo',
        new Date(rol.created_at).toLocaleDateString('es-CL'),
        new Date(rol.updated_at).toLocaleDateString('es-CL')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `roles-servicio-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rolesFiltrados = roles.filter(rol => {
    if (filtroEstado === 'activos') return rol.activo;
    if (filtroEstado === 'inactivos') return !rol.activo;
    return true; // todos
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roles de Servicio</CardTitle>
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
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats?.total_roles || roles.length}</div>
            <div className="text-sm text-muted-foreground">Total Roles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats?.roles_activos || roles.filter(r => r.activo).length}</div>
            <div className="text-sm text-muted-foreground">Activos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats?.roles_inactivos || roles.filter(r => !r.activo).length}</div>
            <div className="text-sm text-muted-foreground">Inactivos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats?.roles_con_estructura || 0}</div>
            <div className="text-sm text-muted-foreground">Con Estructura</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⚙️ Mantenedor de Roles de Servicio</span>
            <Badge variant="secondary">{roles.length} roles</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Formulario para crear nuevo rol */}
          <div className="border-b pb-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">➕ Crear Nuevo Rol</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Rol</label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Supervisor Día"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción</label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción opcional"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleCrearRol}
                  disabled={creando || !formData.nombre.trim()}
                  className="w-full"
                >
                  {creando ? 'Creando...' : 'Crear Rol'}
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla de roles existentes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">📋 Roles Existentes</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtrar:</span>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'activos' | 'inactivos')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="todos">Todos ({roles.length})</option>
                  <option value="activos">Activos ({roles.filter(r => r.activo).length})</option>
                  <option value="inactivos">Inactivos ({roles.filter(r => !r.activo).length})</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportarRoles}
                  disabled={rolesFiltrados.length === 0}
                  className="ml-2"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {roles.length === 0 ? 'No hay roles de servicio configurados' : 'No hay roles que coincidan con el filtro'}
                    </TableCell>
                  </TableRow>
                ) : (
                  rolesFiltrados.map((rol) => (
                    <TableRow key={rol.id}>
                      <TableCell>
                        {editando === rol.id ? (
                          <Input
                            value={editData.nombre}
                            onChange={(e) => setEditData(prev => ({ ...prev, nombre: e.target.value }))}
                            className="w-full"
                          />
                        ) : (
                          <span className="font-medium">{rol.nombre}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editando === rol.id ? (
                          <Input
                            value={editData.descripcion}
                            onChange={(e) => setEditData(prev => ({ ...prev, descripcion: e.target.value }))}
                            className="w-full"
                          />
                        ) : (
                          <span className="text-muted-foreground">{rol.descripcion || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editando === rol.id ? (
                          <select
                            value={editData.activo ? 'true' : 'false'}
                            onChange={(e) => setEditData(prev => ({ ...prev, activo: e.target.value === 'true' }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                          >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                          </select>
                        ) : (
                          <Badge variant={rol.activo ? 'default' : 'secondary'}>
                            {rol.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(rol.created_at).toLocaleDateString('es-CL')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {editando === rol.id ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleGuardarEdicion}
                              className="text-green-600 hover:text-green-700"
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
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditar(rol)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleActivo(rol)}
                              className={rol.activo ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                            >
                              {rol.activo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            {rol.activo ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInactivarCompleto(rol)}
                                className="text-red-600 hover:text-red-700"
                                title="Inactivar completamente (libera estructuras y guardias)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReactivar(rol)}
                                className="text-purple-600 hover:text-purple-700"
                                title="Reactivar rol de servicio"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEliminarRol(rol)}
                              className="text-gray-600 hover:text-gray-700"
                              title="Eliminar permanentemente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 