'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Building2,
  Users,
  DollarSign,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Settings,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FiltrosUnificados {
  instalacion: string;
  rol: string;
  guardia: string;
  tipo: 'todos' | 'servicio' | 'guardia';
  prioridad: 'todos' | 'personal' | 'servicio';
  estado: 'todos' | 'activos' | 'inactivos';
  busqueda: string;
}

interface EstructuraServicio {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  rol_servicio_id: string;
  rol_nombre: string;
  rol_completo: string;
  sueldo_base: number;
  guardias_asignados?: number;
  activo: boolean;
  fecha_inactivacion?: string;
  created_at: string;
  updated_at: string;
  historial: any[];
  bonos: {
    id: string;
    nombre: string;
    monto: number;
    imponible: boolean;
  }[];
}

interface EstructurasServicioTabProps {
  filtros: FiltrosUnificados;
}

export default function EstructurasServicioTab({ filtros }: EstructurasServicioTabProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [estructuras, setEstructuras] = useState<EstructuraServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [instalaciones, setInstalaciones] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [filtrosLocales, setFiltrosLocales] = useState({
    instalacion: 'todas',
    rol: 'todos'
  });
  const [editingValues, setEditingValues] = useState<{
    sueldo_base: string;
    bono_1: string;
    bono_2: string;
    bono_3: string;
  }>({
    sueldo_base: '',
    bono_1: '',
    bono_2: '',
    bono_3: ''
  });
  const [savingRow, setSavingRow] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Cargar estructuras de servicio
  useEffect(() => {
    cargarEstructuras();
  }, [filtros, filtrosLocales]);

  const cargarDatosIniciales = async () => {
    try {
      const response = await fetch('/api/payroll/estructuras-unificadas/filtros');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInstalaciones(data.data.instalaciones);
          setRoles(data.data.roles);
        }
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const cargarEstructuras = async () => {
    setLoading(true);
    try {
      // Construir URL con filtros (combinar filtros globales y locales)
      const params = new URLSearchParams();
      
      // Usar filtros locales si están configurados, sino usar filtros globales
      const instalacionFiltro = filtrosLocales.instalacion !== 'todas' ? filtrosLocales.instalacion : filtros.instalacion;
      const rolFiltro = filtrosLocales.rol !== 'todos' ? filtrosLocales.rol : filtros.rol;
      
      if (instalacionFiltro !== 'todas') params.append('instalacion_id', instalacionFiltro);
      if (rolFiltro !== 'todos') params.append('rol_id', rolFiltro);
      if (filtros.estado !== 'todos') params.append('estado', filtros.estado);
      params.append('tipo', 'servicio');

      const response = await fetch(`/api/payroll/estructuras-unificadas?${params}`);
      const data = await response.json();
      if (data.success) {
        setEstructuras(data.data.estructuras);
      }
    } catch (error) {
      console.error('Error cargando estructuras:', error);
      toastError("Error", "No se pudieron cargar las estructuras de servicio");
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (estructura: EstructuraServicio) => {
    setEditingRow(estructura.id);
    setEditingValues({
      sueldo_base: estructura.sueldo_base.toString(),
      bono_1: estructura.bonos.find(b => b.nombre.toLowerCase().includes('colación'))?.monto.toString() || '0',
      bono_2: estructura.bonos.find(b => b.nombre.toLowerCase().includes('movilización'))?.monto.toString() || '0',
      bono_3: estructura.bonos.find(b => b.nombre.toLowerCase().includes('responsabilidad'))?.monto.toString() || '0'
    });
  };

  const handleGuardar = async (estructuraId: string) => {
    setSavingRow(estructuraId);
    try {
      const response = await fetch('/api/payroll/estructuras/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instalacion_id: estructuras.find(e => e.id === estructuraId)?.instalacion_id,
          rol_servicio_id: estructuras.find(e => e.id === estructuraId)?.rol_servicio_id,
          sueldo_base: parseInt(editingValues.sueldo_base) || 0,
          bono_1: parseInt(editingValues.bono_1) || 0,
          bono_2: parseInt(editingValues.bono_2) || 0,
          bono_3: parseInt(editingValues.bono_3) || 0
        }),
      });

      if (response.ok) {
        toastSuccess("Éxito", "Estructura actualizada correctamente");
        setEditingRow(null);
        cargarEstructuras();
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (error) {
      console.error('Error guardando estructura:', error);
      toastError("Error", "No se pudo actualizar la estructura");
    } finally {
      setSavingRow(null);
    }
  };

  const handleCancelar = () => {
    setEditingRow(null);
    setEditingValues({
      sueldo_base: '',
      bono_1: '',
      bono_2: '',
      bono_3: ''
    });
  };

  const toggleActivo = async (estructuraId: string, activo: boolean) => {
    try {
      const response = await fetch(`/api/payroll/estructuras/${estructuraId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !activo }),
      });

      if (response.ok) {
        toastSuccess("Éxito", `Estructura ${activo ? 'desactivada' : 'activada'} correctamente`);
        cargarEstructuras();
      } else {
        throw new Error('Error al cambiar estado');
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toastError("Error", "No se pudo cambiar el estado de la estructura");
    }
  };

  const crearNuevaEstructura = () => {
    // Redirigir a la página de instalaciones para crear nueva estructura
    router.push('/instalaciones');
  };

  const handleFiltroLocalChange = (campo: 'instalacion' | 'rol', valor: string) => {
    setFiltrosLocales(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const filtrarEstructuras = (estructuras: EstructuraServicio[]) => {
    return estructuras.filter(estructura => {
      // Filtro por instalación
      if (filtros.instalacion !== 'todas' && estructura.instalacion_id !== filtros.instalacion) {
        return false;
      }

      // Filtro por rol
      if (filtros.rol !== 'todos' && estructura.rol_servicio_id !== filtros.rol) {
        return false;
      }

      // Filtro por estado
      if (filtros.estado === 'activos' && !estructura.activo) {
        return false;
      }
      if (filtros.estado === 'inactivos' && estructura.activo) {
        return false;
      }

      // Filtro por búsqueda
      if (filtros.busqueda && !estructura.instalacion_nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
          !estructura.rol_nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())) {
        return false;
      }

      return true;
    });
  };

  const estructurasFiltradas = filtrarEstructuras(estructuras);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Cargando estructuras de servicio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del tab */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Estructuras de Servicio
          </h2>
          <p className="text-muted-foreground">
            Gestión de estructuras salariales por instalación y rol de servicio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {estructurasFiltradas.length} estructuras
          </Badge>
          <Button onClick={crearNuevaEstructura} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Estructura
          </Button>
        </div>
      </div>

      {/* Filtros locales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Filtros Locales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filtro-instalacion-local">Instalación</Label>
              <Select 
                value={filtrosLocales.instalacion} 
                onValueChange={(value) => handleFiltroLocalChange('instalacion', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las instalaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las instalaciones</SelectItem>
                  {instalaciones.map((instalacion: any) => (
                    <SelectItem key={instalacion.id} value={instalacion.id}>
                      {instalacion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtro-rol-local">Rol de Servicio</Label>
              <Select 
                value={filtrosLocales.rol} 
                onValueChange={(value) => handleFiltroLocalChange('rol', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  {roles.map((rol: any) => (
                    <SelectItem key={rol.id} value={rol.id}>
                      {rol.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de prioridad */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Las estructuras de servicio se aplican cuando un guardia no tiene estructura personal asignada. 
          Tienen prioridad menor que las estructuras por guardia.
        </AlertDescription>
      </Alert>

      {/* Tabla de estructuras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Estructuras de Servicio ({estructurasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estructurasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron estructuras de servicio</p>
              <p className="text-sm">Crea una nueva estructura o ajusta los filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instalación</TableHead>
                    <TableHead>Rol de Servicio</TableHead>
                    <TableHead>Guardias Asignados</TableHead>
                    <TableHead>Sueldo Base</TableHead>
                    <TableHead>Bonos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estructurasFiltradas.map((estructura) => {
                    const isEditing = editingRow === estructura.id;
                    const isSaving = savingRow === estructura.id;

                    return (
                      <TableRow key={estructura.id}>
                        <TableCell className="font-medium">
                          {estructura.instalacion_nombre}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{estructura.rol_nombre}</div>
                            <div className="text-sm text-muted-foreground">{estructura.rol_completo}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {estructura.guardias_asignados || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingValues.sueldo_base}
                              onChange={(e) => setEditingValues(prev => ({
                                ...prev,
                                sueldo_base: e.target.value
                              }))}
                              className="w-24"
                            />
                          ) : (
                            <span className="font-mono">
                              ${estructura.sueldo_base.toLocaleString('es-CL')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="space-y-1">
                              <Input
                                type="number"
                                placeholder="Colación"
                                value={editingValues.bono_1}
                                onChange={(e) => setEditingValues(prev => ({
                                  ...prev,
                                  bono_1: e.target.value
                                }))}
                                className="w-20"
                              />
                              <Input
                                type="number"
                                placeholder="Movilización"
                                value={editingValues.bono_2}
                                onChange={(e) => setEditingValues(prev => ({
                                  ...prev,
                                  bono_2: e.target.value
                                }))}
                                className="w-20"
                              />
                              <Input
                                type="number"
                                placeholder="Responsabilidad"
                                value={editingValues.bono_3}
                                onChange={(e) => setEditingValues(prev => ({
                                  ...prev,
                                  bono_3: e.target.value
                                }))}
                                className="w-20"
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {estructura.bonos.map((bono) => (
                                <div key={bono.id} className="text-sm">
                                  <span className="font-medium">{bono.nombre}:</span>
                                  <span className="ml-1 font-mono">
                                    ${bono.monto.toLocaleString('es-CL')}
                                  </span>
                                  <Badge variant="outline" className="ml-1 text-xs">
                                    {bono.imponible ? 'Imponible' : 'No Imponible'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={estructura.activo}
                              onCheckedChange={() => toggleActivo(estructura.id, estructura.activo)}
                              disabled={isEditing}
                            />
                            <Badge variant={estructura.activo ? "default" : "secondary"}>
                              {estructura.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleGuardar(estructura.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelar}
                                disabled={isSaving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
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
                                onClick={() => toggleActivo(estructura.id, estructura.activo)}
                              >
                                {estructura.activo ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
