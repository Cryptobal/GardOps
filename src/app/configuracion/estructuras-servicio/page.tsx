'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import BonoModal from './components/BonoModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  Shield, 
  DollarSign, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Settings,
  Filter,
  Search
} from 'lucide-react';

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
  instalacion_id: string;
  instalacion_nombre: string;
  rol_servicio_id: string;
  rol_nombre: string;
  rol_completo: string;
  sueldo_base: number;
  activo: boolean;
  fecha_inactivacion?: string;
  created_at: string;
  updated_at: string;
  bonos: {
    id: string;
    nombre: string;
    monto: number;
    imponible: boolean;
  }[];
}

export default function EstructurasServicioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('estructuras');
  const [estructuras, setEstructuras] = useState<EstructuraServicio[]>([]);
  const [bonos, setBonos] = useState<BonoGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBonoModalOpen, setIsBonoModalOpen] = useState(false);
  const [bonoSeleccionado, setBonoSeleccionado] = useState<BonoGlobal | null>(null);
  const [savingBonoId, setSavingBonoId] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    instalacion: 'todas',
    rol: 'todos',
    activo: 'true'
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
    } finally {
      setLoading(false);
    }
  };

  // --- Bonos Globales: acciones ---
  const abrirNuevoBono = () => {
    setBonoSeleccionado(null);
    setIsBonoModalOpen(true);
  };

  const abrirEditarBono = (bono: BonoGlobal) => {
    setBonoSeleccionado(bono);
    setIsBonoModalOpen(true);
  };

  const guardarBono = async (data: Partial<BonoGlobal>) => {
    // Crear o actualizar según exista bonoSeleccionado
    if (bonoSeleccionado) {
      await fetch(`/api/bonos-globales/${bonoSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: data.nombre,
          descripcion: data.descripcion,
          imponible: data.imponible,
          activo: data.activo,
        }),
      });
    } else {
      await fetch('/api/bonos-globales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: data.nombre,
          descripcion: data.descripcion,
          imponible: data.imponible,
        }),
      });
    }
    await cargarDatos();
  };

  const toggleActivoBono = async (bono: BonoGlobal) => {
    try {
      setSavingBonoId(bono.id);
      await fetch(`/api/bonos-globales/${bono.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !bono.activo }),
      });
      await cargarDatos();
    } catch (error) {
      console.error('Error cambiando estado del bono:', error);
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
    } catch (error) {
      console.error('Error eliminando bono:', error);
    } finally {
      setSavingBonoId(null);
    }
  };

  // Filtrar estructuras
  const estructurasFiltradas = estructuras.filter(estructura => {
    if (filtros.instalacion && filtros.instalacion !== 'todas' && estructura.instalacion_nombre !== filtros.instalacion) return false;
    if (filtros.rol && filtros.rol !== 'todos' && estructura.rol_nombre !== filtros.rol) return false;
    if (filtros.activo === 'true' && !estructura.activo) return false;
    if (filtros.activo === 'false' && estructura.activo) return false;
    return true;
  });

  // Obtener opciones únicas para filtros
  const instalaciones = Array.from(new Set(estructuras.map(e => e.instalacion_nombre)));
  const roles = Array.from(new Set(estructuras.map(e => e.rol_nombre)));

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

  const toggleActivaEstructura = async (estructura: EstructuraServicio) => {
    try {
      await fetch('/api/estructuras-servicio/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instalacion_id: estructura.instalacion_id,
          rol_servicio_id: estructura.rol_servicio_id,
          activo: !estructura.activo,
        }),
      });
      await cargarDatos();
    } catch (error) {
      console.error('Error cambiando estado de estructura:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando estructuras de servicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estructuras de Servicio</h1>
          <p className="text-muted-foreground">
            Gestión de estructuras de servicio y bonos globales
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="estructuras" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Estructuras
          </TabsTrigger>
          <TabsTrigger value="bonos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Bonos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estructuras" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={filtros.instalacion} onValueChange={(value) => setFiltros({...filtros, instalacion: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las instalaciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las instalaciones</SelectItem>
                    {instalaciones.map(instalacion => (
                      <SelectItem key={instalacion} value={instalacion}>
                        {instalacion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtros.rol} onValueChange={(value) => setFiltros({...filtros, rol: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los roles</SelectItem>
                    {roles.map(rol => (
                      <SelectItem key={rol} value={rol}>
                        {rol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtros.activo} onValueChange={(value) => setFiltros({...filtros, activo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="true">Activas</SelectItem>
                    <SelectItem value="false">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Estructuras de Servicio ({estructurasFiltradas.length})</span>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Estructura
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instalación</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Sueldo Base</TableHead>
                    <TableHead>Bonos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Imponible</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estructurasFiltradas.map((estructura) => (
                    <TableRow key={`${estructura.instalacion_id}-${estructura.rol_servicio_id}`}>
                      <TableCell className="font-medium">
                        {estructura.instalacion_nombre}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{estructura.rol_nombre}</div>
                          <div className="text-sm text-muted-foreground">
                            {estructura.rol_completo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${estructura.sueldo_base.toLocaleString('es-CL')}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {estructura.bonos.map((bono) => (
                            <div key={bono.id} className="flex items-center gap-2">
                              <Badge variant={bono.imponible ? "default" : "secondary"} className="text-xs">
                                {bono.imponible ? 'Imp' : 'No Imp'}
                              </Badge>
                              <span className="text-sm">{bono.nombre}: ${bono.monto.toLocaleString('es-CL')}</span>
                            </div>
                          ))}
                          {estructura.bonos.length === 0 && (
                            <span className="text-sm text-muted-foreground">Sin bonos</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${calcularTotalEstructura(estructura).toLocaleString('es-CL')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${calcularTotalImponible(estructura).toLocaleString('es-CL')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={estructura.activo ? "default" : "secondary"}>
                          {estructura.activo ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Activa
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Inactiva
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(estructura.created_at).toLocaleDateString('es-CL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => irAEditarEstructura(estructura)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleActivaEstructura(estructura)}>
                            {estructura.activo ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Bonos Globales ({bonos.length})</span>
                <Button size="sm" onClick={abrirNuevoBono}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Bono
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonos.map((bono) => (
                    <TableRow key={bono.id}>
                      <TableCell className="font-medium">
                        {bono.nombre}
                      </TableCell>
                      <TableCell>
                        {bono.descripcion || 'Sin descripción'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bono.imponible ? "default" : "secondary"}>
                          {bono.imponible ? 'Imponible' : 'No Imponible'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={bono.activo ? "default" : "secondary"}>
                          {bono.activo ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Activo
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Inactivo
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(bono.created_at).toLocaleDateString('es-CL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => abrirEditarBono(bono)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de creación/edición de Bono */}
      <BonoModal
        isOpen={isBonoModalOpen}
        onClose={() => setIsBonoModalOpen(false)}
        bono={bonoSeleccionado}
        onSave={guardarBono}
      />
    </div>
  );
}
