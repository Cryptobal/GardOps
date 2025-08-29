'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Building2,
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
  Star,
  Shield,
  ArrowUp,
  ArrowDown,
  Info,
  TrendingUp,
  TrendingDown
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

interface EstructuraUnificada {
  id: string;
  tipo: 'servicio' | 'guardia';
  prioridad: 'personal' | 'servicio';
  
  // Datos comunes
  instalacion_id?: string;
  instalacion_nombre?: string;
  rol_id?: string;
  rol_nombre?: string;
  sueldo_base: number;
  total_imponible: number;
  total_no_imponible: number;
  activo: boolean;
  
  // Datos específicos de servicio
  guardias_asignados?: number;
  
  // Datos específicos de guardia
  guardia_id?: string;
  guardia_nombre?: string;
  guardia_rut?: string;
  vigencia_desde?: string;
  vigencia_hasta?: string | null;
  
  // Items
  items: {
    id: string;
    codigo: string;
    nombre: string;
    monto: number;
    imponible: boolean;
  }[];
}

interface VistaUnificadaTabProps {
  filtros: FiltrosUnificados;
}

export default function VistaUnificadaTab({ filtros }: VistaUnificadaTabProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [estructuras, setEstructuras] = useState<EstructuraUnificada[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState<string | null>(null);

  // Cargar estructuras unificadas
  useEffect(() => {
    cargarEstructurasUnificadas();
  }, [filtros]);

  const cargarEstructurasUnificadas = async () => {
    setLoading(true);
    try {
      // Construir URL con filtros
      const params = new URLSearchParams();
      if (filtros.instalacion !== 'todas') params.append('instalacion_id', filtros.instalacion);
      if (filtros.rol !== 'todos') params.append('rol_id', filtros.rol);
      if (filtros.guardia !== 'todos') params.append('guardia_id', filtros.guardia);
      if (filtros.tipo !== 'todos') params.append('tipo', filtros.tipo);
      if (filtros.prioridad !== 'todos') params.append('prioridad', filtros.prioridad);
      if (filtros.estado !== 'todos') params.append('estado', filtros.estado);

      const response = await fetch(`/api/payroll/estructuras-unificadas?${params}`);
      const data = await response.json();
      if (data.success) {
        setEstructuras(data.data.estructuras);
      }
    } catch (error) {
      console.error('Error cargando estructuras unificadas:', error);
      toastError("Error", "No se pudieron cargar las estructuras unificadas");
    } finally {
      setLoading(false);
    }
  };

  const filtrarEstructuras = (estructuras: EstructuraUnificada[]) => {
    return estructuras.filter(estructura => {
      // Filtro por tipo
      if (filtros.tipo !== 'todos' && estructura.tipo !== filtros.tipo) {
        return false;
      }

      // Filtro por prioridad
      if (filtros.prioridad !== 'todos' && estructura.prioridad !== filtros.prioridad) {
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

      // Filtro por guardia (solo para estructuras por guardia)
      if (filtros.guardia !== 'todos' && estructura.tipo === 'guardia' && estructura.guardia_id !== filtros.guardia) {
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
      if (filtros.busqueda) {
        const searchTerm = filtros.busqueda.toLowerCase();
        const matchesInstalacion = estructura.instalacion_nombre?.toLowerCase().includes(searchTerm);
        const matchesRol = estructura.rol_nombre?.toLowerCase().includes(searchTerm);
        const matchesGuardia = estructura.guardia_nombre?.toLowerCase().includes(searchTerm);
        
        if (!matchesInstalacion && !matchesRol && !matchesGuardia) {
          return false;
        }
      }

      return true;
    });
  };

  const estructurasFiltradas = filtrarEstructuras(estructuras);

  const getTipoIcon = (tipo: 'servicio' | 'guardia') => {
    return tipo === 'servicio' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const getPrioridadBadge = (prioridad: 'personal' | 'servicio') => {
    if (prioridad === 'personal') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Personal</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">🟡 Servicio</Badge>;
    }
  };

  const getTipoBadge = (tipo: 'servicio' | 'guardia') => {
    if (tipo === 'servicio') {
      return <Badge variant="outline" className="flex items-center gap-1">🏗️ Servicio</Badge>;
    } else {
      return <Badge variant="outline" className="flex items-center gap-1">👤 Guardia</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Cargando vista unificada...</span>
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
            <Eye className="h-6 w-6" />
            Vista Unificada
          </h2>
          <p className="text-muted-foreground">
            Vista consolidada de todas las estructuras con indicadores de prioridad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {estructurasFiltradas.length} estructuras
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {estructurasFiltradas.filter(e => e.prioridad === 'personal').length} personal
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            {estructurasFiltradas.filter(e => e.prioridad === 'servicio').length} servicio
          </Badge>
        </div>
      </div>

      {/* Información de prioridad */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>🟢 Estructuras Personales:</strong> Tienen prioridad alta y sobrescriben las estructuras de servicio. 
          <br />
          <strong>🟡 Estructuras de Servicio:</strong> Se aplican cuando no hay estructura personal. 
          <br />
          <strong>💡 Consejo:</strong> Las estructuras personales siempre tienen precedencia sobre las de servicio.
        </AlertDescription>
      </Alert>

      {/* Tabla unificada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Estructuras Unificadas ({estructurasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estructurasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron estructuras</p>
              <p className="text-sm">Ajusta los filtros o crea nuevas estructuras</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Instalación/Rol</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Sueldo Base</TableHead>
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
                      <TableRow 
                        key={estructura.id}
                        className={estructura.prioridad === 'personal' ? 'bg-green-50' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTipoIcon(estructura.tipo)}
                            {getTipoBadge(estructura.tipo)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPrioridadBadge(estructura.prioridad)}
                        </TableCell>
                        <TableCell>
                          {estructura.tipo === 'servicio' ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Estructura de Servicio</div>
                                <div className="text-sm text-muted-foreground">
                                  {estructura.guardias_asignados || 0} guardias asignados
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{estructura.guardia_nombre}</div>
                                <div className="text-sm text-muted-foreground">{estructura.guardia_rut}</div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{estructura.instalacion_nombre || 'Sin asignar'}</div>
                            <div className="text-sm text-muted-foreground">{estructura.rol_nombre || 'Sin rol'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {estructura.tipo === 'guardia' && estructura.vigencia_desde ? (
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
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin fecha específica</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            ${estructura.sueldo_base.toLocaleString('es-CL')}
                          </span>
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
                              disabled={true} // Por ahora deshabilitado en vista unificada
                            />
                            <Badge variant={estructura.activo ? "default" : "secondary"}>
                              {estructura.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Navegar a la página específica según el tipo
                                if (estructura.tipo === 'servicio') {
                                  // Navegar a tab de estructuras de servicio
                                  toastSuccess("Info", "Navegando a estructuras de servicio...");
                                } else {
                                  // Navegar a tab de estructuras por guardia
                                  toastSuccess("Info", "Navegando a estructuras por guardia...");
                                }
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Mostrar detalles de la estructura
                                toastSuccess("Info", `Mostrando detalles de ${estructura.tipo === 'servicio' ? 'estructura de servicio' : 'estructura por guardia'}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Resumen de prioridades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Resumen de Prioridades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-green-600" />
                Estructuras Personales (Prioridad Alta)
              </h4>
              <p className="text-sm text-muted-foreground">
                Estas estructuras sobrescriben las estructuras de servicio y se aplican específicamente al guardia.
              </p>
              <Badge variant="outline" className="bg-green-50">
                {estructurasFiltradas.filter(e => e.prioridad === 'personal').length} estructuras
              </Badge>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-yellow-600" />
                Estructuras de Servicio (Prioridad Baja)
              </h4>
              <p className="text-sm text-muted-foreground">
                Se aplican cuando no hay estructura personal asignada al guardia.
              </p>
              <Badge variant="outline" className="bg-yellow-50">
                {estructurasFiltradas.filter(e => e.prioridad === 'servicio').length} estructuras
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
