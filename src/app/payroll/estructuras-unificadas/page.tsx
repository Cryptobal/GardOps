'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/use-admin';
import { Plus, Filter, Search, Trash2, Edit, Eye } from 'lucide-react';

// Tipos TypeScript
interface EstructuraUnificada {
  tipo: 'servicio' | 'guardia';
  id: string;
  instalacion_id: string | null;
  instalacion_nombre: string | null;
  rol_servicio_id: string | null;
  rol_nombre: string | null;
  guardia_id: string | null;
  guardia_nombre: string | null;
  guardia_rut: string | null;
  sueldo_base: string;
  bono_movilizacion: string;
  bono_colacion: string;
  bono_responsabilidad: string;
  bonos_detalle: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_inactivacion: string | null;
  prioridad: string;
}

interface FormularioEstructura {
  tipo: 'servicio' | 'guardia';
  instalacion_id: string;
  rol_servicio_id: string;
  guardia_id: string;
  sueldo_base: string;
  bono_movilizacion: string;
  bono_colacion: string;
  bono_responsabilidad: string;
  descripcion: string;
}

interface FiltrosUnificados {
  instalacion: string;
  rol: string;
  guardia: string;
  estado: string;
}

interface DatosFiltros {
  instalaciones: Array<{ id: string; nombre: string }>;
  roles: Array<{ id: string; nombre: string }>;
  guardias: Array<{ id: string; nombre_completo: string; rut: string }>;
  bonos: Array<{ id: string; nombre: string }>;
}

interface DatosModal {
  instalacionesConRoles: Array<{ id: string; nombre: string; roles: Array<{ id: string; nombre: string }> }>;
  rolesPorInstalacion: Array<{ id: string; nombre: string }>;
  todosLosGuardias: Array<{ id: string; nombre_completo: string; rut: string }>;
  bonos: Array<{ id: string; nombre: string }>;
}

export default function EstructurasUnificadasPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Estados principales
  const [activeTab, setActiveTab] = useState('servicio');
  const [loadingData, setLoadingData] = useState(true);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    tipo: string;
    nuevoEstado: boolean;
    instalacion: string;
  } | null>(null);
  const [estructuras, setEstructuras] = useState<EstructuraUnificada[]>([]);
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  
  // Estados de filtros y formularios
  const [filtros, setFiltros] = useState<FiltrosUnificados>({
    instalacion: 'todas',
    rol: 'todos',
    guardia: 'todos',
    estado: 'todos'
  });

  const [formulario, setFormulario] = useState<FormularioEstructura>({
    tipo: 'servicio',
    instalacion_id: '',
    rol_servicio_id: '',
    guardia_id: '',
    sueldo_base: '',
    bono_id: '',
    monto_bono: '',
    bono_movilizacion: '',
    bono_colacion: '',
    bono_responsabilidad: '',
    descripcion: ''
  });

  const [datosFiltros, setDatosFiltros] = useState<DatosFiltros>({
    instalaciones: [],
    roles: [],
    guardias: [],
    bonos: []
  });

  const [datosModal, setDatosModal] = useState<DatosModal>({
    instalacionesConRoles: [],
    rolesPorInstalacion: [],
    todosLosGuardias: [],
    bonos: []
  });

  // Funciones de formateo de números
  const formatearNumero = (valor: string | number): string => {
    const numero = typeof valor === 'string' ? parseFloat(valor.replace(/\./g, '')) : valor;
    return numero.toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const limpiarFormato = (valor: string): number => {
    return parseInt(valor.replace(/\./g, ''), 10);
  };

  // Cargar datos iniciales
  const cargarDatosIniciales = async () => {
    setLoadingData(true);
    try {
      const response = await fetch('/api/payroll/estructuras-unificadas/filtros');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDatosFiltros(data.data);
        }
      } else {
        setDatosFiltros({
          instalaciones: [],
          roles: [],
          guardias: [],
          bonos: []
        });
      }
    } catch (error) {
      setDatosFiltros({
        instalaciones: [],
        roles: [],
        guardias: [],
        bonos: []
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Cargar datos del modal
  const cargarDatosModal = async () => {
    setLoadingModal(true);
    try {
      // Cargar instalaciones con roles
      const instalacionesResponse = await fetch('/api/payroll/instalaciones-con-roles');
      const instalacionesData = instalacionesResponse.ok ? await instalacionesResponse.json() : { success: false, data: [] };
      
      // Cargar todos los guardias
      const guardiasResponse = await fetch('/api/guardias');
      const guardiasData = guardiasResponse.ok ? await guardiasResponse.json() : { success: false, data: [] };
      
      // Cargar bonos
      const bonosResponse = await fetch('/api/payroll/bonos');
      const bonosData = bonosResponse.ok ? await bonosResponse.json() : { success: false, data: [] };

      setDatosModal({
        instalacionesConRoles: instalacionesData.success ? instalacionesData.data : [],
        rolesPorInstalacion: [],
        todosLosGuardias: guardiasData.success ? guardiasData.data : [],
        bonos: bonosData.success ? bonosData.data : []
      });
    } catch (error) {
      console.error('Error cargando datos del modal:', error);
    } finally {
      setLoadingModal(false);
    }
  };

  // Cargar estructuras
  const cargarEstructuras = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.instalacion !== 'todas') params.append('instalacionId', filtros.instalacion);
      if (filtros.rol !== 'todos') params.append('rolId', filtros.rol);
      if (filtros.guardia !== 'todos') params.append('guardiaId', filtros.guardia);
      if (filtros.estado !== 'todos') params.append('estado', filtros.estado);

      const response = await fetch(`/api/payroll/estructuras-unificadas?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEstructuras(data.data);
        }
      }
    } catch (error) {
      console.error('Error cargando estructuras:', error);
    }
  };

  // Crear estructura
  const crearEstructura = async () => {
    setLoadingCreate(true);
    try {
      const datosEnviar = {
        ...formulario,
        sueldo_base: limpiarFormato(formulario.sueldo_base),
        bono_movilizacion: limpiarFormato(formulario.bono_movilizacion),
        bono_colacion: limpiarFormato(formulario.bono_colacion),
        bono_responsabilidad: limpiarFormato(formulario.bono_responsabilidad)
      };

      const response = await fetch('/api/payroll/estructuras-unificadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnviar)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          success(`Estructura ${formulario.tipo} creada correctamente`);
          setShowCreateModal(false);
          resetearFormulario();
          cargarEstructuras();
        } else {
          showError(data.error || 'Error al crear la estructura');
        }
      } else {
        showError('Error de conexión');
      }
    } catch (error) {
      showError('Error interno');
    } finally {
      setLoadingCreate(false);
    }
  };

  // Eliminar estructura
  const eliminarEstructura = async (id: string, tipo: string, instalacion: string) => {
    if (!isAdmin) {
      showError('No tienes permisos para eliminar estructuras');
      return;
    }
    
    try {
      const response = await fetch(`/api/payroll/estructuras-unificadas/${id}/delete`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          success(`Estructura ${tipo} eliminada correctamente`);
          cargarEstructuras();
        } else {
          showError(data.error || 'Error al eliminar la estructura');
        }
      } else {
        showError('Error de conexión');
      }
    } catch (error) {
      showError('Error interno');
    }
  };

  // Cambiar estado de estructura
  const cambiarEstadoEstructura = async (id: string, tipo: string, nuevoEstado: boolean, instalacion: string) => {
    try {
      const response = await fetch(`/api/payroll/estructuras-unificadas/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          success(`Estructura ${nuevoEstado ? 'activada' : 'desactivada'} correctamente`);
          cargarEstructuras();
        } else {
          showError(data.error || 'Error al cambiar estado');
        }
      } else {
        showError('Error de conexión');
      }
    } catch (error) {
      showError('Error interno');
    }
  };

  // Resetear formulario
  const resetearFormulario = () => {
    setFormulario({
      tipo: 'servicio',
      instalacion_id: '',
      rol_servicio_id: '',
      guardia_id: '',
      sueldo_base: '',
      bono_id: '',
      monto_bono: '',
      bono_movilizacion: '',
      bono_colacion: '',
      bono_responsabilidad: '',
      descripcion: ''
    });
  };

  // Filtrar estructuras por tipo
  const estructurasFiltradas = estructuras.filter(estructura => {
    if (activeTab === 'servicio') return estructura.tipo === 'servicio';
    if (activeTab === 'guardia') return estructura.tipo === 'guardia';
    return true; // Vista unificada
  });

  // Efectos
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    cargarEstructuras();
  }, [filtros]);

  useEffect(() => {
    if (showCreateModal) {
      cargarDatosModal();
    }
  }, [showCreateModal]);

  // Renderizado de tabla
  const renderTablaEstructuras = (estructuras: EstructuraUnificada[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Instalación</TableHead>
          <TableHead>Rol/Guardia</TableHead>
          <TableHead>Sueldo Base</TableHead>
          <TableHead>Bonos</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {estructuras.map((estructura) => (
          <TableRow key={estructura.id}>
            <TableCell>
              <Badge variant={estructura.tipo === 'servicio' ? 'default' : 'secondary'}>
                {estructura.tipo === 'servicio' ? '🟡 Servicio' : '🟢 Guardia'}
              </Badge>
            </TableCell>
            <TableCell>{estructura.instalacion_nombre || 'N/A'}</TableCell>
            <TableCell>
              {estructura.tipo === 'servicio' 
                ? estructura.rol_nombre 
                : `${estructura.guardia_nombre} (${estructura.guardia_rut})`
              }
            </TableCell>
            <TableCell>${formatearNumero(estructura.sueldo_base)}</TableCell>
            <TableCell>
              <div className="text-xs text-muted-foreground max-w-xs truncate">
                {estructura.bonos_detalle}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={estructura.activo ? 'default' : 'destructive'}>
                {estructura.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(estructura.fecha_creacion).toLocaleDateString('es-CL')}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarEstadoEstructura(
                    estructura.id, 
                    estructura.tipo, 
                    !estructura.activo, 
                    estructura.instalacion_nombre || ''
                  )}
                >
                  {estructura.activo ? 'Desactivar' : 'Activar'}
                </Button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => eliminarEstructura(estructura.id, estructura.tipo, estructura.instalacion_nombre || '')}
                  >
                    🗑️ Eliminar
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🏗️ Estructuras Unificadas</h1>
          <p className="text-muted-foreground">
            Gestiona estructuras de servicio y por guardia desde una interfaz unificada
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Estructura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Estructura</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Tipo de estructura */}
              <div className="space-y-2">
                <Label>Tipo de Estructura</Label>
                <Select 
                  value={formulario.tipo} 
                  onValueChange={(value: 'servicio' | 'guardia') => 
                    setFormulario(prev => ({ ...prev, tipo: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servicio">🟡 Estructura de Servicio</SelectItem>
                    <SelectItem value="guardia">🟢 Estructura por Guardia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos específicos por tipo */}
              {formulario.tipo === 'servicio' ? (
                <>
                  <div className="space-y-2">
                    <Label>Instalación</Label>
                    <Select 
                      value={formulario.instalacion_id} 
                      onValueChange={(value) => 
                        setFormulario(prev => ({ ...prev, instalacion_id: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar instalación" />
                      </SelectTrigger>
                      <SelectContent>
                        {datosModal.instalacionesConRoles.map((instalacion) => (
                          <SelectItem key={instalacion.id} value={instalacion.id}>
                            {instalacion.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Rol de Servicio</Label>
                    <Select 
                      value={formulario.rol_servicio_id} 
                      onValueChange={(value) => 
                        setFormulario(prev => ({ ...prev, rol_servicio_id: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {datosModal.instalacionesConRoles
                          .find(i => i.id === formulario.instalacion_id)?.roles
                          .map((rol) => (
                            <SelectItem key={rol.id} value={rol.id}>
                              {rol.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Guardia</Label>
                  <Select 
                    value={formulario.guardia_id} 
                    onValueChange={(value) => 
                      setFormulario(prev => ({ ...prev, guardia_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar guardia" />
                    </SelectTrigger>
                    <SelectContent>
                      {datosModal.todosLosGuardias.map((guardia) => (
                        <SelectItem key={guardia.id} value={guardia.id}>
                          {guardia.nombre_completo} ({guardia.rut})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Campos de remuneración */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sueldo Base</Label>
                  <Input
                    type="text"
                    value={formatearNumero(formulario.sueldo_base)}
                    onChange={(e) => {
                      const valorLimpio = limpiarFormato(e.target.value);
                      setFormulario(prev => ({ ...prev, sueldo_base: valorLimpio.toString() }));
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>🚌 Movilización</Label>
                  <Input
                    type="text"
                    value={formatearNumero(formulario.bono_movilizacion)}
                    onChange={(e) => {
                      const valorLimpio = limpiarFormato(e.target.value);
                      setFormulario(prev => ({ ...prev, bono_movilizacion: valorLimpio.toString() }));
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>🍽️ Colación</Label>
                  <Input
                    type="text"
                    value={formatearNumero(formulario.bono_colacion)}
                    onChange={(e) => {
                      const valorLimpio = limpiarFormato(e.target.value);
                      setFormulario(prev => ({ ...prev, bono_colacion: valorLimpio.toString() }));
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>⭐ Responsabilidad</Label>
                  <Input
                    type="text"
                    value={formatearNumero(formulario.bono_responsabilidad)}
                    onChange={(e) => {
                      const valorLimpio = limpiarFormato(e.target.value);
                      setFormulario(prev => ({ ...prev, bono_responsabilidad: valorLimpio.toString() }));
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={crearEstructura} disabled={loadingCreate}>
                {loadingCreate ? 'Creando...' : 'Crear Estructura'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
            >
              {filtrosExpandidos ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </CardHeader>
        {filtrosExpandidos && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Instalación</Label>
                <Select 
                  value={filtros.instalacion} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las instalaciones</SelectItem>
                    {datosFiltros.instalaciones.map((instalacion) => (
                      <SelectItem key={instalacion.id} value={instalacion.id}>
                        {instalacion.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <Select 
                  value={filtros.rol} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, rol: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los roles</SelectItem>
                    {datosFiltros.roles.map((rol) => (
                      <SelectItem key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Guardia</Label>
                <Select 
                  value={filtros.guardia} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, guardia: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los guardias</SelectItem>
                    {datosFiltros.guardias.map((guardia) => (
                      <SelectItem key={guardia.id} value={guardia.id}>
                        {guardia.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                  value={filtros.estado} 
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activos">Solo activos</SelectItem>
                    <SelectItem value="inactivos">Solo inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabs y contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="servicio">🟡 Estructuras de Servicio</TabsTrigger>
          <TabsTrigger value="guardia">🟢 Estructuras por Guardia</TabsTrigger>
          <TabsTrigger value="unificada">📊 Vista Unificada</TabsTrigger>
        </TabsList>

        <TabsContent value="servicio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estructuras de Servicio ({estructurasFiltradas.filter(e => e.tipo === 'servicio').length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="text-center py-8">Cargando...</div>
              ) : estructurasFiltradas.filter(e => e.tipo === 'servicio').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay estructuras de servicio
                </div>
              ) : (
                renderTablaEstructuras(estructurasFiltradas.filter(e => e.tipo === 'servicio'))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardia" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estructuras por Guardia ({estructurasFiltradas.filter(e => e.tipo === 'guardia').length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="text-center py-8">Cargando...</div>
              ) : estructurasFiltradas.filter(e => e.tipo === 'guardia').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay estructuras por guardia
                </div>
              ) : (
                renderTablaEstructuras(estructurasFiltradas.filter(e => e.tipo === 'guardia'))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unificada" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vista Unificada ({estructurasFiltradas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="text-center py-8">Cargando...</div>
              ) : estructurasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay estructuras
                </div>
              ) : (
                renderTablaEstructuras(estructurasFiltradas)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
