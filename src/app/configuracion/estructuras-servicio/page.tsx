'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import BonoModal from './components/BonoModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  DollarSign, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  Filter,
  Search,
  Calendar,
  RefreshCw,
  PowerOff,
  Power,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BonoGlobal {
  id: string;
  nombre: string;
  descripcion?: string;
  imponible: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
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

export default function EstructurasServicioPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState('estructuras');
  const [estructuras, setEstructuras] = useState<EstructuraServicio[]>([]);
  const [bonos, setBonos] = useState<BonoGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBonoModalOpen, setIsBonoModalOpen] = useState(false);
  const [bonoSeleccionado, setBonoSeleccionado] = useState<BonoGlobal | null>(null);
  const [savingBonoId, setSavingBonoId] = useState<string | null>(null);
  // Eliminado historial en esta vista (solo se deja Editar)
  const [filtros, setFiltros] = useState({
    instalacion: 'todas',
    rol: 'todos',
    activo: 'todos',
    busqueda: ''
  });

  // Cargar datos
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar estructuras
      const estructurasResponse = await fetch('/api/estructuras-servicio/global');
      const estructurasData = await estructurasResponse.json();
      if (estructurasData.success) {
        setEstructuras(estructurasData.data);
      }

      // Cargar bonos
      const bonosResponse = await fetch('/api/bonos-globales');
      const bonosData = await bonosResponse.json();
      if (bonosData.success) {
        setBonos(bonosData.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError("Error", "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  // --- Bonos: acciones ---
  const abrirNuevoBono = () => {
    setBonoSeleccionado(null);
    setIsBonoModalOpen(true);
  };

  const abrirEditarBono = (bono: BonoGlobal) => {
    setBonoSeleccionado(bono);
    setIsBonoModalOpen(true);
  };

  const guardarBono = async (data: Partial<BonoGlobal>) => {
    try {
      const url = bonoSeleccionado 
        ? `/api/bonos-globales/${bonoSeleccionado.id}`
        : '/api/bonos-globales';
      
      const method = bonoSeleccionado ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar el bono');
      }

      await cargarDatos();
      setIsBonoModalOpen(false);
      success("Éxito", `Bono ${bonoSeleccionado ? 'actualizado' : 'creado'} correctamente`);
    } catch (error) {
      console.error('Error guardando bono:', error);
      showError("Error", error instanceof Error ? error.message : "No se pudo guardar el bono");
    }
  };

  const toggleActivoBono = async (bono: BonoGlobal) => {
    try {
      setSavingBonoId(bono.id);
      const res = await fetch(`/api/bonos-globales/${bono.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !bono.activo }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.error) || 'No se pudo cambiar el estado del bono');
      }

      await cargarDatos();
      success("Éxito", `Bono ${bono.activo ? 'inactivado' : 'activado'} correctamente`);
    } catch (error) {
      console.error('Error cambiando estado de bono:', error);
      showError("Error", "No se pudo cambiar el estado del bono");
    } finally {
      setSavingBonoId(null);
    }
  };

  const eliminarBono = async (bono: BonoGlobal) => {
    try {
      if (!confirm(`¿Eliminar el bono "${bono.nombre}"? Esta acción no se puede deshacer.`)) return;
      setSavingBonoId(bono.id);
      const res = await fetch(`/api/bonos-globales/${bono.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.error) || 'No se pudo eliminar el bono');
      }
      await cargarDatos();
      success("Éxito", "Bono eliminado correctamente");
    } catch (error) {
      console.error('Error eliminando bono:', error);
      showError("Error", error instanceof Error ? error.message : "No se pudo eliminar el bono");
    } finally {
      setSavingBonoId(null);
    }
  };

  // Filtrar estructuras
  const estructurasFiltradas = estructuras.filter(estructura => {
    // Filtros
    if (filtros.instalacion !== 'todas' && estructura.instalacion_nombre !== filtros.instalacion) return false;
    if (filtros.rol !== 'todos' && estructura.rol_nombre !== filtros.rol) return false;
    if (filtros.activo !== 'todos' && estructura.activo !== (filtros.activo === 'true')) return false;
    
    // Filtro de búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      return (
        estructura.instalacion_nombre.toLowerCase().includes(busqueda) ||
        estructura.rol_nombre.toLowerCase().includes(busqueda) ||
        estructura.rol_completo.toLowerCase().includes(busqueda)
      );
    }
    
    return true;
  });

  // Obtener opciones únicas para filtros
  const instalaciones = Array.from(new Set(estructuras.map(e => e.instalacion_nombre))).sort();
  const roles = Array.from(new Set(estructuras.map(e => e.rol_nombre))).sort();

  const calcularTotalEstructura = (estructura: EstructuraServicio) => {
    return estructura.sueldo_base + estructura.bonos.reduce((sum, bono) => sum + bono.monto, 0);
  };

  const calcularTotalImponible = (estructura: EstructuraServicio) => {
    return estructura.sueldo_base + estructura.bonos
      .filter(bono => bono.imponible)
      .reduce((sum, bono) => sum + bono.monto, 0);
  };

  // --- Estructuras: acciones ---
  const irAEditarEstructura = (estructura: EstructuraServicio) => {
    router.push(`/instalaciones/${estructura.instalacion_id}?tab=estructura&rol=${estructura.rol_servicio_id}`);
  };

  // Acciones de historial/activar-inactivar eliminadas

  const crearNuevaEstructura = () => {
    // Redirigir a la página de instalaciones para crear nueva estructura
    router.push('/instalaciones');
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Estructuras de Servicio</h1>
          <p className="text-muted-foreground">Gestiona las estructuras de sueldo y bonos globales</p>
        </div>
        <Button onClick={crearNuevaEstructura} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Estructura
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="estructuras" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Estructuras
          </TabsTrigger>
          <TabsTrigger value="bonos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Bonos Globales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estructuras" className="space-y-4">
          {/* Filtros y controles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros y Controles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Instalación</Label>
                  <Select value={filtros.instalacion} onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las instalaciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas las instalaciones</SelectItem>
                      {instalaciones.map(inst => (
                        <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={filtros.rol} onValueChange={(value) => setFiltros(prev => ({ ...prev, rol: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los roles</SelectItem>
                      {roles.map(rol => (
                        <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={filtros.activo} onValueChange={(value) => setFiltros(prev => ({ ...prev, activo: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="true">Activas</SelectItem>
                      <SelectItem value="false">Inactivas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Búsqueda</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={filtros.busqueda}
                      onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                      className="pl-8 w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>


            </CardContent>
          </Card>

          {/* Tabla de estructuras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Estructuras de Servicio
                </span>
                <Badge variant="secondary">
                  {estructurasFiltradas.length} de {estructuras.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instalación</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Sueldo Base</TableHead>
                      <TableHead>Guardias asignados</TableHead>
                      <TableHead>Bonos</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creación</TableHead>
                      <TableHead>Inactivación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estructurasFiltradas.map((estructura) => (
                      <TableRow key={estructura.id} className={!estructura.activo ? 'bg-muted/50' : ''}>
                        <TableCell className="font-medium">{estructura.instalacion_nombre}</TableCell>
                        <TableCell>
                          <span className="font-medium">{estructura.rol_nombre}</span>
                        </TableCell>
                        <TableCell>${estructura.sueldo_base.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              (estructura.guardias_asignados ?? 0) > 0
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }
                          >
                            {estructura.guardias_asignados ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const totalBonos = estructura.bonos.reduce((sum, bono) => sum + bono.monto, 0);
                            return (
                              <span className="font-medium">${totalBonos.toLocaleString()}</span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${calcularTotalEstructura(estructura).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              estructura.activo
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }
                          >
                            {estructura.activo ? (
                              <span className="flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Activa
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <X className="h-3 w-3" />
                                Inactiva
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(estructura.created_at).toLocaleDateString('es-CL')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{estructura.fecha_inactivacion ? new Date(estructura.fecha_inactivacion).toLocaleDateString('es-CL') : '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => irAEditarEstructura(estructura)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Bonos Globales
                </span>
                <Button onClick={abrirNuevoBono} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Bono
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Imponible</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonos.map((bono) => (
                      <TableRow key={bono.id}>
                        <TableCell className="font-medium">{bono.nombre}</TableCell>
                        <TableCell>{bono.descripcion || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={bono.imponible ? "default" : "secondary"}>
                            {bono.imponible ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={bono.activo ? "default" : "secondary"}>
                            {bono.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirEditarBono(bono)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleActivoBono(bono)}
                              disabled={savingBonoId === bono.id}
                            >
                              {bono.activo ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => eliminarBono(bono)}
                              disabled={savingBonoId === bono.id}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <BonoModal
        isOpen={isBonoModalOpen}
        onClose={() => setIsBonoModalOpen(false)}
        bono={bonoSeleccionado}
        onSave={guardarBono}
      />
    </div>
  );
}