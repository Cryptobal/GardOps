'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { 
  getRolesServicio, 
  crearRolServicio, 
  actualizarRolServicio, 
  eliminarRolServicio 
} from '@/lib/api/roles-servicio';
import { RolServicio, CrearRolServicioData } from '@/lib/schemas/roles-servicio';
import ConfirmDeleteModal from '@/components/ui/confirm-delete-modal';

export default function RolesServicioPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RolServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rolToDelete, setRolToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CrearRolServicioData>({
    nombre: '',
    dias_trabajo: 4,
    dias_descanso: 4,
    horas_turno: 12,
    hora_inicio: '08:00',
    hora_termino: '20:00',
    estado: 'Activo'
  });

  const [editData, setEditData] = useState<CrearRolServicioData>({
    nombre: '',
    dias_trabajo: 4,
    dias_descanso: 4,
    horas_turno: 12,
    hora_inicio: '08:00',
    hora_termino: '20:00',
    estado: 'Activo'
  });

  useEffect(() => {
    cargarRoles();
  }, []);

  const cargarRoles = async () => {
    try {
      setLoading(true);
      const rolesData = await getRolesServicio();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error cargando roles:', error);
      toast.error('No se pudieron cargar los roles de servicio', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearRol = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre del rol es requerido', 'Error');
      return;
    }

    try {
      setCreando(true);
      await crearRolServicio(formData);
      
      toast.success('Rol de servicio creado correctamente', 'Éxito');

      // Limpiar formulario
      setFormData({
        nombre: '',
        dias_trabajo: 4,
        dias_descanso: 4,
        horas_turno: 12,
        hora_inicio: '08:00',
        hora_termino: '20:00',
        estado: 'Activo'
      });

      await cargarRoles();
    } catch (error) {
      console.error('Error creando rol:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el rol', 'Error');
    } finally {
      setCreando(false);
    }
  };

  const handleEditar = (rol: RolServicio) => {
    setEditando(rol.id);
    setEditData({
      nombre: rol.nombre,
      dias_trabajo: rol.dias_trabajo,
      dias_descanso: rol.dias_descanso,
      horas_turno: rol.horas_turno,
      hora_inicio: rol.hora_inicio,
      hora_termino: rol.hora_termino,
      estado: rol.estado
    });
  };

  const handleGuardarEdicion = async () => {
    if (!editando || !editData.nombre.trim()) {
      toast.error('El nombre del rol es requerido', 'Error');
      return;
    }

    try {
      await actualizarRolServicio(editando, editData);
      toast.success('Rol de servicio actualizado correctamente', 'Éxito');
      setEditando(null);
      await cargarRoles();
    } catch (error) {
      console.error('Error actualizando rol:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el rol', 'Error');
    }
  };

  const handleCancelarEdicion = () => {
    setEditando(null);
  };

  const handleEliminarRol = (rolId: string) => {
    setRolToDelete(rolId);
    setDeleteModalOpen(true);
  };

  const confirmarEliminar = async () => {
    try {
      if (rolToDelete) {
        await eliminarRolServicio(rolToDelete);
        toast.success('Rol de servicio eliminado correctamente', 'Éxito');
        await cargarRoles();
      }
    } catch (error) {
      console.error('Error eliminando rol:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el rol', 'Error');
    } finally {
      setDeleteModalOpen(false);
      setRolToDelete(null);
    }
  };

  const formatearHorario = (horaInicio: string, horaTermino: string) => {
    return `${horaInicio} a ${horaTermino}`;
  };

  const formatearCiclo = (diasTrabajo: number, diasDescanso: number) => {
    return `${diasTrabajo}x${diasDescanso}`;
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Rol</label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Día 4x4x12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Días Trabajo</label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.dias_trabajo}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dias_trabajo: parseInt(e.target.value) || 4 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Días Descanso</label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.dias_descanso}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dias_descanso: parseInt(e.target.value) || 4 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Horas por Turno</label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.horas_turno}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    horas_turno: parseInt(e.target.value) || 12 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hora Inicio</label>
                <Input
                  type="time"
                  value={formData.hora_inicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hora Término</label>
                <Input
                  type="time"
                  value={formData.hora_termino}
                  onChange={(e) => setFormData(prev => ({ ...prev, hora_termino: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
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
            <h3 className="text-lg font-semibold">📋 Roles Existentes</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay roles de servicio configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((rol) => (
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
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="7"
                              value={editData.dias_trabajo}
                              onChange={(e) => setEditData(prev => ({ 
                                ...prev, 
                                dias_trabajo: parseInt(e.target.value) || 4 
                              }))}
                              className="w-16"
                            />
                            <span className="text-muted-foreground">x</span>
                            <Input
                              type="number"
                              min="1"
                              max="7"
                              value={editData.dias_descanso}
                              onChange={(e) => setEditData(prev => ({ 
                                ...prev, 
                                dias_descanso: parseInt(e.target.value) || 4 
                              }))}
                              className="w-16"
                            />
                          </div>
                        ) : (
                          <Badge variant="outline">
                            {formatearCiclo(rol.dias_trabajo, rol.dias_descanso)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editando === rol.id ? (
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={editData.hora_inicio}
                              onChange={(e) => setEditData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                              className="w-24"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                              type="time"
                              value={editData.hora_termino}
                              onChange={(e) => setEditData(prev => ({ ...prev, hora_termino: e.target.value }))}
                              className="w-24"
                            />
                          </div>
                        ) : (
                          <span>{formatearHorario(rol.hora_inicio, rol.hora_termino)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editando === rol.id ? (
                          <Input
                            type="number"
                            min="1"
                            max="24"
                            value={editData.horas_turno}
                            onChange={(e) => setEditData(prev => ({ 
                              ...prev, 
                              horas_turno: parseInt(e.target.value) || 12 
                            }))}
                            className="w-20"
                          />
                        ) : (
                          <span>{rol.horas_turno}h</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editando === rol.id ? (
                          <select
                            value={editData.estado}
                            onChange={(e) => setEditData(prev => ({ ...prev, estado: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                          >
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                          </select>
                        ) : (
                          <Badge variant={rol.estado === 'Activo' ? 'default' : 'secondary'}>
                            {rol.estado}
                          </Badge>
                        )}
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
                              onClick={() => handleEliminarRol(rol.id)}
                              className="text-red-600 hover:text-red-700"
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

      {/* Modal de confirmación para eliminar */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRolToDelete(null);
        }}
        onConfirm={confirmarEliminar}
        title="Eliminar Rol de Servicio"
        message="¿Estás seguro de que quieres eliminar este rol de servicio? Esta acción no se puede deshacer."
        confirmText="Eliminar Rol"
        cancelText="Cancelar"
      />
    </div>
  );
} 