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
  Download,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getEstructurasSueldo, 
  inactivarEstructuraServicio
} from '@/lib/api/estructuras-sueldo';
import { getRolesServicio } from '@/lib/api/roles-servicio';
import { crearNuevaEstructuraServicio } from '@/lib/api/roles-servicio';
import { 
  EstructuraSueldo
} from '@/lib/schemas/estructuras-sueldo';
import { RolServicio } from '@/lib/schemas/roles-servicio';

export default function EstructurasServicioPage() {
  const { success, error } = useToast();
  const [estructuras, setEstructuras] = useState<EstructuraSueldo[]>([]);
  const [roles, setRoles] = useState<RolServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [creandoNueva, setCreandoNueva] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    sueldo_base: 680000,
    bono_asistencia: 0,
    bono_responsabilidad: 0,
    bono_noche: 0,
    bono_feriado: 0,
    bono_riesgo: 0,
    otros_bonos: [],
    motivo: '',
    crear_nueva_automaticamente: true
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
    } catch (err) {
      console.error('Error cargando datos:', err);
      error('No se pudieron cargar los datos', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleInactivarEstructura = async (estructura: EstructuraSueldo) => {
    const motivo = prompt('Ingrese el motivo de la inactivación (opcional):');
    const crearNueva = confirm('¿Desea crear una nueva estructura automáticamente?');
    
    try {
      const resultado = await inactivarEstructuraServicio(
        estructura.id, 
        motivo || undefined, 
        undefined, 
        crearNueva
      );
      
      success(
        `Estructura inactivada. ${resultado.nueva_estructura_creada ? 'Nueva estructura creada automáticamente.' : ''}`,
        'Éxito'
      );
      
      await cargarDatos();
    } catch (err) {
      console.error('Error inactivando estructura:', err);
      error(err instanceof Error ? err.message : 'No se pudo inactivar la estructura', 'Error');
    }
  };

  const handleCrearNuevaEstructura = async (rolId: string) => {
    try {
      setCreandoNueva(rolId);
      
      const resultado = await crearNuevaEstructuraServicio(rolId, {
        ...formData,
        motivo: formData.motivo || 'Nueva estructura creada manualmente'
      });
      
      success('Nueva estructura creada correctamente', 'Éxito');
      
      await cargarDatos();
      setCreandoNueva(null);
      setFormData({
        sueldo_base: 680000,
        bono_asistencia: 0,
        bono_responsabilidad: 0,
        bono_noche: 0,
        bono_feriado: 0,
        bono_riesgo: 0,
        otros_bonos: [],
        motivo: '',
        crear_nueva_automaticamente: true
      });
    } catch (err) {
      console.error('Error creando nueva estructura:', err);
      error(err instanceof Error ? err.message : 'No se pudo crear la nueva estructura', 'Error');
      setCreandoNueva(null);
    }
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(valor);
  };

  const calcularSueldoLiquido = (estructura: EstructuraSueldo) => {
    const totalBonos = 
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
      (estructura.bonificacion_otros || 0);
    
    const totalDescuentos = 
      (estructura.descuento_afp || 0) +
      (estructura.descuento_salud || 0) +
      (estructura.descuento_impuesto || 0) +
      (estructura.descuento_otros || 0);
    
    return (estructura.sueldo_base || 0) + totalBonos - totalDescuentos;
  };

  const estructurasFiltradas = estructuras.filter(estructura => {
    if (filtroEstado === 'activos') return estructura.activo;
    if (filtroEstado === 'inactivos') return !estructura.activo;
    return true; // todos
  });

  const rolesConEstructura = roles.filter(rol => 
    estructuras.some(es => es.rol_id === rol.id && es.activo)
  );

  const rolesSinEstructura = roles.filter(rol => 
    !estructuras.some(es => es.rol_id === rol.id && es.activo)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estructuras de Servicio</CardTitle>
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
            <span>🏗️ Gestión de Estructuras de Servicio</span>
            <Badge variant="secondary">{estructuras.length} estructuras</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{estructuras.length}</div>
                <div className="text-sm text-muted-foreground">Total Estructuras</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{estructuras.filter(e => e.activo).length}</div>
                <div className="text-sm text-muted-foreground">Activas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-600">{estructuras.filter(e => !e.activo).length}</div>
                <div className="text-sm text-muted-foreground">Inactivas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{rolesSinEstructura.length}</div>
                <div className="text-sm text-muted-foreground">Roles sin Estructura</div>
              </CardContent>
            </Card>
          </div>

          {/* Roles sin estructura */}
          {rolesSinEstructura.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">⚠️ Roles sin Estructura Activa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rolesSinEstructura.map(rol => (
                  <Card key={rol.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{rol.nombre}</h4>
                        <p className="text-sm text-muted-foreground">{rol.descripcion || 'Sin descripción'}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCrearNuevaEstructura(rol.id)}
                        disabled={creandoNueva === rol.id}
                      >
                        {creandoNueva === rol.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Creando...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Estructura
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📋 Estructuras Existentes</h3>
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
          </div>

          {/* Tabla de estructuras */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol de Servicio</TableHead>
                <TableHead>Sueldo Base</TableHead>
                <TableHead>Sueldo Líquido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estructurasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {estructuras.length === 0 ? 'No hay estructuras de servicio configuradas' : 'No hay estructuras que coincidan con el filtro'}
                  </TableCell>
                </TableRow>
              ) : (
                estructurasFiltradas.map((estructura) => {
                  const rol = roles.find(r => r.id === estructura.rol_id);
                  return (
                    <TableRow key={estructura.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{rol?.nombre || 'Rol no encontrado'}</span>
                          {rol?.descripcion && (
                            <p className="text-sm text-muted-foreground">{rol.descripcion}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-blue-600">
                          {formatearMoneda(estructura.sueldo_base || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">
                          {formatearMoneda(calcularSueldoLiquido(estructura))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={estructura.activo ? 'default' : 'secondary'}>
                          {estructura.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(estructura.created_at).toLocaleDateString('es-CL')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {estructura.activo ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInactivarEstructura(estructura)}
                              className="text-red-600 hover:text-red-700"
                              title="Inactivar estructura (opcionalmente crear nueva)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCrearNuevaEstructura(estructura.rol_id)}
                              className="text-purple-600 hover:text-purple-700"
                              title="Crear nueva estructura para este rol"
                              disabled={creandoNueva === estructura.rol_id}
                            >
                              {creandoNueva === estructura.rol_id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
