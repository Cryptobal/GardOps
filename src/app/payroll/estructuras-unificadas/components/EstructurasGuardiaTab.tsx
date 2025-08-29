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
  User,
  Users,
  DollarSign,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Settings,
  AlertCircle,
  Calendar,
  Clock,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FiltrosUnificados {
  instalacion: string;
  rol: string;
  guardia: string;
  tipo: 'todos' | 'servicio' | 'guardia';
  prioridad: 'todos' | 'personal' | 'servicio';
  estado: 'todos' | 'activos' | 'inactivos';
  busqueda: string;
}

interface EstructuraGuardia {
  id: string;
  guardia_id: string;
  guardia_nombre: string;
  guardia_rut: string;
  instalacion_id?: string;
  instalacion_nombre?: string;
  rol_id?: string;
  rol_nombre?: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  activo: boolean;
  sueldo_base: number;
  total_bonos: number;
  total_imponible: number;
  total_no_imponible: number;
  items: {
    id: string;
    codigo: string;
    nombre: string;
    monto: number;
    imponible: boolean;
  }[];
}

interface EstructurasGuardiaTabProps {
  filtros: FiltrosUnificados;
}

export default function EstructurasGuardiaTab({ filtros }: EstructurasGuardiaTabProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [estructuras, setEstructuras] = useState<EstructuraGuardia[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardias, setGuardias] = useState<any[]>([]);
  const [filtrosLocales, setFiltrosLocales] = useState({
    guardia: 'todos'
  });
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{
    sueldo_base: string;
    vigencia_desde: string;
    vigencia_hasta: string;
  }>({
    sueldo_base: '',
    vigencia_desde: '',
    vigencia_hasta: ''
  });
  const [savingRow, setSavingRow] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Cargar estructuras por guardia
  useEffect(() => {
    cargarEstructuras();
  }, [filtros, filtrosLocales]);

  const cargarDatosIniciales = async () => {
    try {
      const response = await fetch('/api/payroll/estructuras-unificadas/filtros');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGuardias(data.data.guardias);
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
      const guardiaFiltro = filtrosLocales.guardia !== 'todos' ? filtrosLocales.guardia : filtros.guardia;
      
      if (filtros.instalacion !== 'todas') params.append('instalacion_id', filtros.instalacion);
      if (filtros.rol !== 'todos') params.append('rol_id', filtros.rol);
      if (guardiaFiltro !== 'todos') params.append('guardia_id', guardiaFiltro);
      if (filtros.estado !== 'todos') params.append('estado', filtros.estado);
      params.append('tipo', 'guardia');

      const response = await fetch(`/api/payroll/estructuras-unificadas?${params}`);
      const data = await response.json();
      if (data.success) {
        setEstructuras(data.data.estructuras);
      }
    } catch (error) {
      console.error('Error cargando estructuras por guardia:', error);
      toastError("Error", "No se pudieron cargar las estructuras por guardia");
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (estructura: EstructuraGuardia) => {
    setEditingRow(estructura.id);
    setEditingValues({
      sueldo_base: estructura.sueldo_base.toString(),
      vigencia_desde: estructura.vigencia_desde,
      vigencia_hasta: estructura.vigencia_hasta || ''
    });
  };

  const handleGuardar = async (estructuraId: string) => {
    setSavingRow(estructuraId);
    try {
      // Aquí se implementaría la actualización
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      
      toastSuccess("Éxito", "Estructura por guardia actualizada correctamente");
      setEditingRow(null);
      cargarEstructuras();
    } catch (error) {
      console.error('Error guardando estructura:', error);
      toastError("Error", "No se pudo actualizar la estructura por guardia");
    } finally {
      setSavingRow(null);
    }
  };

  const handleCancelar = () => {
    setEditingRow(null);
    setEditingValues({
      sueldo_base: '',
      vigencia_desde: '',
      vigencia_hasta: ''
    });
  };

  const toggleActivo = async (estructuraId: string, activo: boolean) => {
    try {
      // Aquí se implementaría el cambio de estado
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay
      
      toastSuccess("Éxito", `Estructura por guardia ${activo ? 'desactivada' : 'activada'} correctamente`);
      cargarEstructuras();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toastError("Error", "No se pudo cambiar el estado de la estructura");
    }
  };

  const crearNuevaEstructura = () => {
    // Redirigir a la página de guardias para crear nueva estructura
    router.push('/guardias');
  };

  const handleFiltroLocalChange = (campo: 'guardia', valor: string) => {
    setFiltrosLocales(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const filtrarEstructuras = (estructuras: EstructuraGuardia[]) => {
    return estructuras.filter(estructura => {
      // Filtro por guardia
      if (filtros.guardia !== 'todos' && estructura.guardia_id !== filtros.guardia) {
        return false;
      }

      // Filtro por instalación
      if (filtros.instalacion !== 'todas' && estructura.instalacion_id !== filtros.instalacion) {
        return false;
      }

      // Filtro por rol
      if (filtros.rol !== 'todos' && estructura.rol_id !== filtros.rol) {
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
      if (filtros.busqueda && 
          !estructura.guardia_nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
          !estructura.instalacion_nombre?.toLowerCase().includes(filtros.busqueda.toLowerCase())) {
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
          <span>Cargando estructuras por guardia...</span>
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
            <User className="h-6 w-6" />
            Estructuras por Guardia
          </h2>
          <p className="text-muted-foreground">
            Gestión de estructuras salariales individuales por guardia
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
              <Label htmlFor="filtro-guardia-local">Guardia</Label>
              <Select 
                value={filtrosLocales.guardia} 
                onValueChange={(value) => handleFiltroLocalChange('guardia', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los guardias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los guardias</SelectItem>
                  {guardias.map((guardia: any) => (
                    <SelectItem key={guardia.id} value={guardia.id}>
                      {guardia.nombre_completo} ({guardia.rut})
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
        <Star className="h-4 w-4" />
        <AlertDescription>
          Las estructuras por guardia tienen prioridad alta y sobrescriben las estructuras de servicio. 
          Se aplican específicamente al guardia asignado.
        </AlertDescription>
      </Alert>

      {/* Tabla de estructuras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Estructuras por Guardia ({estructurasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estructurasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron estructuras por guardia</p>
              <p className="text-sm">Crea una nueva estructura o ajusta los filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guardia</TableHead>
                    <TableHead>Instalación/Rol</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Sueldo Base</TableHead>
                    <TableHead>Bonos</TableHead>
                    <TableHead>Total</TableHead>
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
                        <TableCell>
                          <div>
                            <div className="font-medium">{estructura.guardia_nombre}</div>
                            <div className="text-sm text-muted-foreground">{estructura.guardia_rut}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{estructura.instalacion_nombre || 'Sin asignar'}</div>
                            <div className="text-sm text-muted-foreground">{estructura.rol_nombre || 'Sin rol'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Desde: {format(new Date(estructura.vigencia_desde), 'dd/MM/yyyy', { locale: es })}</span>
                            </div>
                            {estructura.vigencia_hasta && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Hasta: {format(new Date(estructura.vigencia_hasta), 'dd/MM/yyyy', { locale: es })}</span>
                              </div>
                            )}
                          </div>
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
                          <div className="space-y-1">
                            {estructura.items.filter(item => item.codigo !== 'sueldo_base').map((item) => (
                              <div key={item.id} className="text-sm">
                                <span className="font-medium">{item.nombre}:</span>
                                <span className="ml-1 font-mono">
                                  ${item.monto.toLocaleString('es-CL')}
                                </span>
                                <Badge variant="outline" className="ml-1 text-xs">
                                  {item.imponible ? 'Imponible' : 'No Imponible'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="font-medium">Imponible:</span>
                              <span className="ml-1 font-mono text-green-600">
                                ${estructura.total_imponible.toLocaleString('es-CL')}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">No Imponible:</span>
                              <span className="ml-1 font-mono text-blue-600">
                                ${estructura.total_no_imponible.toLocaleString('es-CL')}
                              </span>
                            </div>
                            <div className="text-sm font-medium">
                              <span>Total:</span>
                              <span className="ml-1 font-mono text-lg">
                                ${(estructura.total_imponible + estructura.total_no_imponible).toLocaleString('es-CL')}
                              </span>
                            </div>
                          </div>
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
