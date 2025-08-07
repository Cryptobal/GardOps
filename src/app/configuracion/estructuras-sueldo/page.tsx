'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Eye,
  EyeOff,
  DollarSign,
  AlertCircle,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getEstructurasSueldo, 
  crearEstructuraSueldo,
  actualizarEstructuraSueldo,
  eliminarEstructuraSueldo,
  toggleEstructuraSueldoActivo
} from '@/lib/api/estructuras-sueldo';
import { getRolesServicio } from '@/lib/api/roles-servicio';
import { 
  EstructuraSueldo, 
  CrearEstructuraSueldoData,
  ActualizarEstructuraSueldoData
} from '@/lib/schemas/estructuras-sueldo';
import { RolServicio } from '@/lib/schemas/roles-servicio';

export default function EstructurasSueldoPage() {
  const { toast } = useToast();
  const [estructuras, setEstructuras] = useState<EstructuraSueldo[]>([]);
  const [roles, setRoles] = useState<RolServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [editData, setEditData] = useState<ActualizarEstructuraSueldoData>({});
  
  const [formData, setFormData] = useState<CrearEstructuraSueldoData>({
    rol_id: '',
    nombre: '',
    descripcion: '',
    sueldo_base: 0,
    bonificacion_nocturna: 0,
    bonificacion_festivo: 0,
    bonificacion_riesgo: 0,
    bonificacion_zona: 0,
    bonificacion_especialidad: 0,
    bonificacion_antiguedad: 0,
    bonificacion_presentismo: 0,
    bonificacion_rendimiento: 0,
    bonificacion_transporte: 0,
    bonificacion_alimentacion: 0,
    bonificacion_otros: 0,
    descuento_afp: 0,
    descuento_salud: 0,
    descuento_impuesto: 0,
    descuento_otros: 0,
    activo: true
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [estructurasData, rolesData] = await Promise.all([
        getEstructurasSueldo(),
        getRolesServicio({ activo: true })
      ]);
      setEstructuras(estructurasData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCrearEstructura = async () => {
    if (!formData.rol_id || !formData.nombre || !formData.sueldo_base) {
      toast({
        title: 'Error',
        description: 'El rol, nombre y sueldo base son requeridos',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreando(true);
      await crearEstructuraSueldo(formData);
      toast({
        title: 'Éxito',
        description: 'Estructura de sueldo creada correctamente'
      });
      
      // Limpiar formulario
      setFormData({
        rol_id: '',
        nombre: '',
        descripcion: '',
        sueldo_base: 0,
        bonificacion_nocturna: 0,
        bonificacion_festivo: 0,
        bonificacion_riesgo: 0,
        bonificacion_zona: 0,
        bonificacion_especialidad: 0,
        bonificacion_antiguedad: 0,
        bonificacion_presentismo: 0,
        bonificacion_rendimiento: 0,
        bonificacion_transporte: 0,
        bonificacion_alimentacion: 0,
        bonificacion_otros: 0,
        descuento_afp: 0,
        descuento_salud: 0,
        descuento_impuesto: 0,
        descuento_otros: 0,
        activo: true
      });
      
      await cargarDatos();
    } catch (error) {
      console.error('Error creando estructura:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear la estructura',
        variant: 'destructive'
      });
    } finally {
      setCreando(false);
    }
  };

  const handleEditar = (estructura: EstructuraSueldo) => {
    setEditando(estructura.id);
    setEditData({
      rol_id: estructura.rol_id,
      nombre: estructura.nombre,
      descripcion: estructura.descripcion,
      sueldo_base: estructura.sueldo_base,
      bonificacion_nocturna: estructura.bonificacion_nocturna,
      bonificacion_festivo: estructura.bonificacion_festivo,
      bonificacion_riesgo: estructura.bonificacion_riesgo,
      bonificacion_zona: estructura.bonificacion_zona,
      bonificacion_especialidad: estructura.bonificacion_especialidad,
      bonificacion_antiguedad: estructura.bonificacion_antiguedad,
      bonificacion_presentismo: estructura.bonificacion_presentismo,
      bonificacion_rendimiento: estructura.bonificacion_rendimiento,
      bonificacion_transporte: estructura.bonificacion_transporte,
      bonificacion_alimentacion: estructura.bonificacion_alimentacion,
      bonificacion_otros: estructura.bonificacion_otros,
      descuento_afp: estructura.descuento_afp,
      descuento_salud: estructura.descuento_salud,
      descuento_impuesto: estructura.descuento_impuesto,
      descuento_otros: estructura.descuento_otros,
      activo: estructura.activo
    });
  };

  const handleGuardar = async () => {
    if (!editando || !editData.nombre || !editData.sueldo_base) {
      toast({
        title: 'Error',
        description: 'El nombre y sueldo base son requeridos',
        variant: 'destructive'
      });
      return;
    }

    try {
      await actualizarEstructuraSueldo(editando, editData);
      toast({
        title: 'Éxito',
        description: 'Estructura de sueldo actualizada correctamente'
      });
      setEditando(null);
      await cargarDatos();
    } catch (error) {
      console.error('Error actualizando estructura:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar la estructura',
        variant: 'destructive'
      });
    }
  };

  const handleCancelar = () => {
    setEditando(null);
    setEditData({});
  };

  const handleEliminar = async (estructura: EstructuraSueldo) => {
    if (!confirm(`¿Estás seguro de eliminar la estructura "${estructura.nombre}"?`)) {
      return;
    }

    try {
      await eliminarEstructuraSueldo(estructura.id);
      toast({
        title: 'Éxito',
        description: 'Estructura de sueldo eliminada correctamente'
      });
      await cargarDatos();
    } catch (error) {
      console.error('Error eliminando estructura:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar la estructura',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActivo = async (estructura: EstructuraSueldo) => {
    try {
      await toggleEstructuraSueldoActivo(estructura.id, !estructura.activo);
      const action = estructura.activo ? 'inactivada' : 'activada';
      toast({
        title: 'Éxito',
        description: `Estructura de sueldo ${action} correctamente`
      });
      await cargarDatos();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cambiar el estado',
        variant: 'destructive'
      });
    }
  };

  const calcularTotalBonificaciones = (estructura: EstructuraSueldo) => {
    return (
      (estructura.bonificacion_nocturna || 0) +
      (estructura.bonificacion_festivo || 0) +
      (estructura.bonificacion_riesgo || 0) +
      (estructura.bonificacion_zona || 0) +
      (estructura.bonificacion_especialidad || 0) +
      (estructura.bonificacion_antiguedad || 0) +
      (estructura.bonificacion_presentismo || 0) +
      (estructura.bonificacion_rendimiento || 0) +
      (estructura.bonificacion_transporte || 0) +
      (estructura.bonificacion_alimentacion || 0) +
      (estructura.bonificacion_otros || 0)
    );
  };

  const calcularTotalDescuentos = (estructura: EstructuraSueldo) => {
    return (
      (estructura.descuento_afp || 0) +
      (estructura.descuento_salud || 0) +
      (estructura.descuento_impuesto || 0) +
      (estructura.descuento_otros || 0)
    );
  };

  const calcularSueldoLiquido = (estructura: EstructuraSueldo) => {
    const totalBonificaciones = calcularTotalBonificaciones(estructura);
    const totalDescuentos = calcularTotalDescuentos(estructura);
    return estructura.sueldo_base + totalBonificaciones - totalDescuentos;
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(valor);
  };

  const exportarEstructuras = () => {
    const headers = ['Rol', 'Nombre', 'Sueldo Base', 'Bonificaciones', 'Descuentos', 'Sueldo Líquido', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...estructurasFiltradas.map(estructura => [
        `"${estructura.rol_nombre || 'N/A'}"`,
        `"${estructura.nombre}"`,
        formatearMoneda(estructura.sueldo_base),
        formatearMoneda(calcularTotalBonificaciones(estructura)),
        formatearMoneda(calcularTotalDescuentos(estructura)),
        formatearMoneda(calcularSueldoLiquido(estructura)),
        estructura.activo ? 'Activo' : 'Inactivo'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `estructuras-sueldo-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const estructurasFiltradas = estructuras.filter(estructura => {
    if (filtroEstado === 'activos') return estructura.activo;
    if (filtroEstado === 'inactivos') return !estructura.activo;
    return true; // todos
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Cargando estructuras de sueldo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estructuras de Sueldo</h1>
          <p className="text-gray-600">
            Gestión de estructuras de sueldo por rol de servicio
          </p>
        </div>
      </div>

      {/* Formulario para crear nueva estructura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Nueva Estructura de Sueldo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol de Servicio</label>
              <select
                value={formData.rol_id}
                onChange={(e) => setFormData(prev => ({ ...prev, rol_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">Seleccionar rol...</option>
                {roles.map(rol => (
                  <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Estructura</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Estructura Base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sueldo Base</label>
              <Input
                type="number"
                value={formData.sueldo_base}
                onChange={(e) => setFormData(prev => ({ ...prev, sueldo_base: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium mb-2">Bonificaciones</h4>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Nocturna"
                  value={formData.bonificacion_nocturna}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonificacion_nocturna: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Festivo"
                  value={formData.bonificacion_festivo}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonificacion_festivo: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Riesgo"
                  value={formData.bonificacion_riesgo}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonificacion_riesgo: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Zona"
                  value={formData.bonificacion_zona}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonificacion_zona: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Descuentos</h4>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="AFP"
                  value={formData.descuento_afp}
                  onChange={(e) => setFormData(prev => ({ ...prev, descuento_afp: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Salud"
                  value={formData.descuento_salud}
                  onChange={(e) => setFormData(prev => ({ ...prev, descuento_salud: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Impuestos"
                  value={formData.descuento_impuesto}
                  onChange={(e) => setFormData(prev => ({ ...prev, descuento_impuesto: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Otros"
                  value={formData.descuento_otros}
                  onChange={(e) => setFormData(prev => ({ ...prev, descuento_otros: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCrearEstructura}
            disabled={creando || !formData.rol_id || !formData.nombre || !formData.sueldo_base}
            className="w-full"
          >
            {creando ? 'Creando...' : 'Crear Estructura de Sueldo'}
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de estructuras existentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Estructuras de Sueldo Existentes
            <Badge variant="secondary">{estructuras.length} estructuras</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtrar:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'activos' | 'inactivos')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="todos">Todos ({estructuras.length})</option>
                <option value="activos">Activos ({estructuras.filter(e => e.activo).length})</option>
                <option value="inactivos">Inactivos ({estructuras.filter(e => !e.activo).length})</option>
              </select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportarEstructuras}
              disabled={estructurasFiltradas.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Sueldo Base</TableHead>
                <TableHead>Bonificaciones</TableHead>
                <TableHead>Descuentos</TableHead>
                <TableHead>Sueldo Líquido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estructurasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {estructuras.length === 0 ? 'No hay estructuras de sueldo configuradas' : 'No hay estructuras que coincidan con el filtro'}
                  </TableCell>
                </TableRow>
              ) : (
                estructurasFiltradas.map((estructura) => (
                  <TableRow key={estructura.id}>
                    <TableCell>
                      <span className="font-medium">{estructura.rol_nombre || 'N/A'}</span>
                    </TableCell>
                    
                    <TableCell>
                      {editando === estructura.id ? (
                        <Input
                          value={editData.nombre || estructura.nombre}
                          onChange={(e) => setEditData(prev => ({ ...prev, nombre: e.target.value }))}
                          className="w-full"
                        />
                      ) : (
                        <span className="font-medium">{estructura.nombre}</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editando === estructura.id ? (
                        <Input
                          type="number"
                          value={editData.sueldo_base || estructura.sueldo_base}
                          onChange={(e) => setEditData(prev => ({ ...prev, sueldo_base: parseInt(e.target.value) || 0 }))}
                          className="w-24"
                        />
                      ) : (
                        <span className="font-medium">
                          {formatearMoneda(estructura.sueldo_base)}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-green-600 font-medium">
                        {formatearMoneda(calcularTotalBonificaciones(estructura))}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-red-600 font-medium">
                        {formatearMoneda(calcularTotalDescuentos(estructura))}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <span className="font-bold text-blue-600">
                        {formatearMoneda(calcularSueldoLiquido(estructura))}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={estructura.activo ? 'default' : 'secondary'}>
                        {estructura.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {editando === estructura.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleGuardar}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelar}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditar(estructura)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleActivo(estructura)}
                              className={estructura.activo ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                            >
                              {estructura.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEliminar(estructura)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Información Importante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Cada rol de servicio puede tener múltiples estructuras de sueldo</p>
            <p>• Las estructuras incluyen sueldo base, bonificaciones y descuentos</p>
            <p>• El sueldo líquido se calcula automáticamente</p>
            <p>• Se pueden activar/inactivar estructuras sin eliminarlas</p>
            <p>• Los cambios se reflejan inmediatamente en los cálculos de sueldo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
