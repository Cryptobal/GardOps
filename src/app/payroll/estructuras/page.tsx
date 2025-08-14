'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Instalacion {
  id: string;
  nombre: string;
  direccion?: string;
}

interface RolServicio {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface SueldoItem {
  id: string;
  codigo: string;
  nombre: string;
  clase: 'HABER' | 'DESCUENTO';
  naturaleza: 'IMPONIBLE' | 'NO_IMPONIBLE';
  descripcion?: string;
  formula_json?: any;
  tope_modo: 'NONE' | 'MONTO' | 'PORCENTAJE';
  tope_valor?: number;
  activo: boolean;
}

interface EstructuraItem {
  id: string;
  estructura_id: string;
  item_id: string; // En la estructura adaptada, esto es el código
  item_nombre: string;
  item_codigo: string;
  item_clase: 'HABER' | 'DESCUENTO';
  item_naturaleza: 'IMPONIBLE' | 'NO_IMPONIBLE';
  monto: number;
  vigencia_desde: string;
  vigencia_hasta?: string;
  activo: boolean;
}

interface EstructuraInstalacion {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  rol_servicio_id: string;
  rol_nombre: string;
  version: number;
  vigencia_desde: string;
  activo: boolean;
  items: EstructuraItem[];
}

export default function EstructurasPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>([]);
  const [itemsGlobales, setItemsGlobales] = useState<SueldoItem[]>([]);
  const [estructura, setEstructura] = useState<EstructuraInstalacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedInstalacion, setSelectedInstalacion] = useState<string>('');
  const [selectedRol, setSelectedRol] = useState<string>('');
  const [periodoMes, setPeriodoMes] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstructuraItem | null>(null);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [baseDialogOpen, setBaseDialogOpen] = useState(false);
  const [createDialogNoCalOpen, setCreateDialogNoCalOpen] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarInstalaciones();
    cargarItemsGlobales();
  }, []);

  // Cargar roles cuando cambie la instalación
  useEffect(() => {
    if (selectedInstalacion) {
      cargarRolesServicio(selectedInstalacion);
      setSelectedRol(''); // Resetear rol seleccionado
    } else {
      setRolesServicio([]);
      setSelectedRol('');
    }
  }, [selectedInstalacion]);

  // Cargar estructura cuando cambian los filtros
  useEffect(() => {
    if (selectedInstalacion && selectedRol) {
      cargarEstructura();
    }
  }, [selectedInstalacion, selectedRol, periodoMes]);

  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/instalaciones?activo=true');
      const data = await response.json();
      if (data.success) {
        setInstalaciones(data.data);
      }
    } catch (error) {
      console.error('Error cargando instalaciones:', error);
      toastError("Error", "No se pudieron cargar las instalaciones");
    }
  };

  const cargarRolesServicio = async (instalacionId?: string) => {
    setRolesLoading(true);
    try {
      const url = instalacionId
        ? `/api/payroll/roles-servicio?instalacion_id=${instalacionId}`
        : '/api/payroll/roles-servicio';

      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok) {
        console.error('roles-servicio error', json);
        toastError("Error", json?.message ?? 'No se pudo cargar roles');
        setRolesServicio([]);
        return;
      }

      setRolesServicio(json.roles ?? []);
    } catch (e: any) {
      console.error('roles-servicio fetch error', e);
      toastError("Error", "Falla de red cargando roles");
      setRolesServicio([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const cargarItemsGlobales = async () => {
    try {
      const response = await fetch('/api/payroll/items/opciones?tipo=haber');
      const data = await response.json();
      if (response.ok) {
        setItemsGlobales(data.items ?? []);
      }
    } catch (error) {
      console.error('Error cargando ítems globales:', error);
      toastError("Error", "No se pudieron cargar los ítems globales");
    }
  };

  const cargarEstructura = async () => {
    if (!selectedInstalacion || !selectedRol) return;

    setLoading(true);
    try {
      const anio = periodoMes.getFullYear();
      const mes = periodoMes.getMonth() + 1;
      
      const response = await fetch(
        `/api/payroll/estructuras/instalacion?instalacion_id=${selectedInstalacion}&rol_servicio_id=${selectedRol}&anio=${anio}&mes=${mes}`
      );
      const data = await response.json();
      if (data.success) {
        setEstructura(data.data.estructura ? {
          ...data.data.estructura,
          items: data.data.items
        } : null);
      } else {
        setEstructura(null);
      }
    } catch (error) {
      console.error('Error cargando estructura:', error);
      toastError("Error", "No se pudo cargar la estructura");
    } finally {
      setLoading(false);
    }
  };

  

  const handleAgregarItem = async () => {
    if (!selectedInstalacion || !selectedRol) return;
    // Si no hay cabecera, abrir creación de estructura (con sueldo base obligatorio)
    if (!estructura) {
      setCreateDialogOpen(true);
      return;
    }
    // Si hay cabecera, abrir modal para agregar bono
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEditarItem = (item: EstructuraItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDesactivarItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/payroll/estructuras/instalacion/items/${itemId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toastSuccess("Éxito", "Ítem desactivado correctamente");
        cargarEstructura();
      }
    } catch (error) {
      console.error('Error desactivando ítem:', error);
      toastError("Error", "No se pudo desactivar el ítem");
    }
  };

  const getItemById = (itemId: string) => {
    return itemsGlobales.find(item => item.id === itemId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Estructuras de Servicio</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instalacion">Instalación *</Label>
              <Select value={selectedInstalacion} onValueChange={setSelectedInstalacion}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar instalación" />
                </SelectTrigger>
                <SelectContent>
                  {instalaciones.map((instalacion) => (
                    <SelectItem key={instalacion.id} value={instalacion.id}>
                      {instalacion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol">Rol de Servicio *</Label>
              <Select value={selectedRol} onValueChange={setSelectedRol} disabled={rolesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={rolesLoading ? "Cargando roles..." : "Seleccionar rol"} />
                </SelectTrigger>
                <SelectContent>
                  {rolesServicio.map((rol) => (
                    <SelectItem key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período de Trabajo</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodoMes && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodoMes ? format(periodoMes, "MMMM yyyy", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom">
                  <Calendar
                    mode="single"
                    selected={periodoMes}
                    onSelect={(date) => date && setPeriodoMes(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      

      {/* Estructura */}
      {selectedInstalacion && selectedRol && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Estructura de Servicio
                {estructura && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    - Versión {estructura.version}
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleAgregarItem} disabled={!selectedInstalacion || !selectedRol}>
                <Plus className="mr-2 h-4 w-4" />
                {estructura ? 'Agregar Línea' : 'Crear estructura de servicio'}
                </Button>
                {!estructura && (
                  <Button
                    variant="secondary"
                    onClick={() => setCreateDialogNoCalOpen(true)}
                    disabled={!selectedInstalacion || !selectedRol}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Crear estructura (sin calendario)
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando estructura...</div>
            ) : estructura ? (
              <div className="space-y-4">
                {/* Información de la estructura y Sueldo base */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Instalación</Label>
                    <p className="text-sm">{estructura.instalacion_nombre}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Rol de Servicio</Label>
                    <p className="text-sm">{estructura.rol_nombre}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Vigencia Desde</Label>
                    <p className="text-sm">{format(new Date(estructura.vigencia_desde), "dd/MM/yyyy")}</p>
                  </div>
                </div>

                {/* Tarjeta de Sueldo base */}
                <SueldoBaseCard
                  estructura={estructura}
                  onEdit={() => setBaseDialogOpen(true)}
                  onDeleted={() => cargarEstructura()}
                />

                {/* Tabla de ítems */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ítem</TableHead>
                      <TableHead>Clase/Naturaleza</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estructura.items.map((item) => {
                      const itemGlobal = getItemById(item.item_id);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.item_nombre}</p>
                              <p className="text-sm text-muted-foreground">{item.item_codigo}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={item.item_clase === 'HABER' ? 'default' : 'secondary'}>
                                {item.item_clase}
                              </Badge>
                              <Badge variant={item.item_naturaleza === 'IMPONIBLE' ? 'default' : 'outline'}>
                                {item.item_naturaleza}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">
                              ${item.monto.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>Desde: {format(new Date(item.vigencia_desde), "dd/MM/yyyy")}</p>
                              {item.vigencia_hasta && (
                                <p>Hasta: {format(new Date(item.vigencia_hasta), "dd/MM/yyyy")}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch checked={item.activo} disabled />
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditarItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDesactivarItem(item.id)}
                                disabled={!item.activo}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {estructura.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay ítems en esta estructura. Haz clic en "Agregar Línea" para comenzar.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                 No se encontró una estructura para los filtros seleccionados.
                Haz clic en "Crear estructura de servicio" para crear una nueva estructura.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal para agregar/editar ítem */}
      <Dialog modal={false} open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Línea' : 'Agregar Línea'}
            </DialogTitle>
          </DialogHeader>
          <ItemForm
            items={itemsGlobales}
            editingItem={editingItem}
            estructuraId={estructura?.id}
            instalacionId={selectedInstalacion}
            rolServicioId={selectedRol}
            onSuccess={() => {
              setDialogOpen(false);
              cargarEstructura();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para crear estructura (cabecera + sueldo base + bonos opcionales) */}
      <Dialog modal={false} open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear estructura de servicio</DialogTitle>
          </DialogHeader>
          <CreateEstructuraForm
            instalacionId={selectedInstalacion}
            rolServicioId={selectedRol}
            periodoMes={periodoMes}
            onSuccess={() => {
              setCreateDialogOpen(false);
              cargarEstructura();
              toastSuccess('Éxito', 'Estructura creada correctamente');
            }}
            onError={(msg) => {
              toastError('Error', msg);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para editar sueldo base */}
      <Dialog modal={false} open={baseDialogOpen} onOpenChange={setBaseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar sueldo base</DialogTitle>
          </DialogHeader>
          {estructura && (
            <SueldoBaseForm
              estructuraId={estructura.id}
              baseItem={estructura.items.find(i => i.item_codigo === 'sueldo_base' && i.activo) || null}
              periodoMes={periodoMes}
              onSuccess={() => {
                setBaseDialogOpen(false);
                cargarEstructura();
                toastSuccess('Éxito', 'Sueldo base actualizado');
              }}
              onDeleted={() => {
                setBaseDialogOpen(false);
                cargarEstructura();
                toastSuccess('Éxito', 'Sueldo base eliminado');
              }}
              onError={(msg) => toastError('Error', msg)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de prueba: Crear estructura SIN calendario */}
      <Dialog modal={false} open={createDialogNoCalOpen} onOpenChange={setCreateDialogNoCalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear estructura de servicio (prueba sin calendario)</DialogTitle>
          </DialogHeader>
          <CreateEstructuraFormNoCalendar
            instalacionId={selectedInstalacion}
            rolServicioId={selectedRol}
            periodoMes={periodoMes}
            onSuccess={() => {
              setCreateDialogNoCalOpen(false);
              cargarEstructura();
              toastSuccess('Éxito', 'Estructura creada correctamente');
            }}
            onError={(msg) => {
              toastError('Error', msg);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente del formulario de ítem
interface ItemFormProps {
  items: SueldoItem[];
  editingItem: EstructuraItem | null;
  estructuraId?: string;
  instalacionId: string;
  rolServicioId: string;
  onSuccess: () => void;
}

function ItemForm({ items, editingItem, estructuraId, instalacionId, rolServicioId, onSuccess }: ItemFormProps) {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [vigenciaDesde, setVigenciaDesde] = useState<Date | undefined>(new Date());
  const [vigenciaHasta, setVigenciaHasta] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredItems, setFilteredItems] = useState<SueldoItem[]>([]);
  const { success: notifySuccess, error: notifyError } = useToast();

  // Filtrar solo ítems de tipo HÁBERES
  const itemsHaberes = items.filter(item => item.clase === 'HABER');

  useEffect(() => {
    if (editingItem) {
      setSelectedItem(editingItem.item_id);
      setMonto(editingItem.monto.toString());
      setVigenciaDesde(new Date(editingItem.vigencia_desde));
      setVigenciaHasta(editingItem.vigencia_hasta ? new Date(editingItem.vigencia_hasta) : undefined);
    }
  }, [editingItem]);

  // Cargar ítems filtrados cuando cambia la búsqueda
  useEffect(() => {
    const cargarItems = async () => {
      try {
        const response = await fetch(`/api/payroll/items/opciones?tipo=haber&q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        if (response.ok) {
          const opts = (data.items ?? []).filter((it: SueldoItem) => it.codigo.toLowerCase() !== 'sueldo_base');
          setFilteredItems(opts);
        }
      } catch (error) {
        console.error('Error cargando ítems:', error);
      }
    };

    cargarItems();
  }, [searchQuery]);

  const selectedItemData = itemsHaberes.find(item => item.id === selectedItem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !monto || !vigenciaDesde) return;

    setLoading(true);
    try {
      const url = editingItem 
        ? `/api/payroll/estructuras/instalacion/items/${editingItem.id}`
        : '/api/payroll/estructuras/instalacion/items';
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const body = editingItem ? {
        monto: parseFloat(monto),
        vigencia_desde: format(vigenciaDesde, 'yyyy-MM-dd'),
        vigencia_hasta: vigenciaHasta ? format(vigenciaHasta, 'yyyy-MM-dd') : null,
      } : {
        instalacion_id: instalacionId,
        rol_servicio_id: rolServicioId,
        item_id: selectedItem, // En la estructura adaptada, esto es el código del ítem
        monto: parseFloat(monto),
        vigencia_desde: format(vigenciaDesde, 'yyyy-MM-dd'),
        vigencia_hasta: vigenciaHasta ? format(vigenciaHasta, 'yyyy-MM-dd') : null,
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        notifySuccess("Éxito", editingItem ? "Línea actualizada correctamente" : "Línea agregada correctamente");
        onSuccess();
      } else {
        let errorMessage = data.error || "Error al guardar la línea";

        // Manejar errores específicos
        if (data.code === 'ITEM_OVERLAP') {
          errorMessage = "Este ítem ya tiene una vigencia que se cruza con el período especificado";
        }

        notifyError("Error", errorMessage);
      }
    } catch (error) {
      console.error('Error guardando ítem:', error);
      notifyError("Error", "Error al guardar la línea");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="item">Ítem (Solo HÁBERES) *</Label>
        <Combobox
          items={filteredItems}
          value={selectedItem}
          onChange={setSelectedItem}
          placeholder="Buscar y seleccionar ítem..."
          searchPlaceholder="Buscar por nombre o código..."
          emptyMessage="No se encontraron ítems de tipo HÁBERES."
        />
      </div>

      {selectedItemData && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">{selectedItemData.nombre}</p>
          <p className="text-xs text-muted-foreground">{selectedItemData.descripcion}</p>
          <div className="flex space-x-2 mt-2">
            <Badge variant={selectedItemData.clase === 'HABER' ? 'default' : 'secondary'}>
              {selectedItemData.clase}
            </Badge>
            <Badge variant={selectedItemData.naturaleza === 'IMPONIBLE' ? 'default' : 'outline'}>
              {selectedItemData.naturaleza}
            </Badge>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="monto">Monto *</Label>
        <Input
          id="monto"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0"
          step="0.01"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Vigencia Desde *</Label>
        <Popover modal={false}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !vigenciaDesde && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {vigenciaDesde ? format(vigenciaDesde, "dd/MM/yyyy") : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom">
            <Calendar
              mode="single"
              selected={vigenciaDesde}
              onSelect={setVigenciaDesde}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Vigencia Hasta (Opcional)</Label>
        <Popover modal={false}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !vigenciaHasta && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {vigenciaHasta ? format(vigenciaHasta, "dd/MM/yyyy") : "Sin límite"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom">
            <Calendar
              mode="single"
              selected={vigenciaHasta}
              onSelect={setVigenciaHasta}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Agregar')}
        </Button>
      </div>
    </form>
  );
}

// Tarjeta de Sueldo base con acciones
function SueldoBaseCard({ estructura, onEdit, onDeleted }: { estructura: EstructuraInstalacion; onEdit: () => void; onDeleted: () => void; }) {
  const { error: notifyError, success: notifySuccess } = useToast();
  const base = estructura.items.find(i => i.item_codigo === 'sueldo_base' && i.activo);
  const handleDelete = async () => {
    if (!base) return;
    const ok = window.confirm('¿Eliminar sueldo base?');
    if (!ok) return;
    try {
      const res = await fetch(`/api/payroll/estructuras/instalacion/sueldo-base/${estructura.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        notifyError('Error', json?.error || 'No se pudo eliminar');
        return;
      }
      onDeleted();
    } catch (e) {
      notifyError('Error', 'No se pudo eliminar');
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Sueldo base</p>
          {base ? (
            <div className="mt-1">
              <span className="font-mono">${base.monto.toLocaleString()}</span>
              <div className="text-xs text-muted-foreground">
                <span>Desde {format(new Date(base.vigencia_desde), 'dd/MM/yyyy')}</span>
                {base.vigencia_hasta && (
                  <span> • Hasta {format(new Date(base.vigencia_hasta), 'dd/MM/yyyy')}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">No definido</div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
          {base && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Formulario de creación de estructura completa
function CreateEstructuraForm({ instalacionId, rolServicioId, periodoMes, onSuccess, onError }: { instalacionId: string; rolServicioId: string; periodoMes: Date; onSuccess: () => void; onError: (msg: string) => void; }) {
  const [sueldoBase, setSueldoBase] = useState<string>('0');
  const [vigenciaDesde, setVigenciaDesde] = useState<Date>(new Date(periodoMes.getFullYear(), periodoMes.getMonth(), 1));
  const [bonosOpcionales, setBonosOpcionales] = useState<SueldoItem[]>([]);
  const [bonoSeleccionadoId, setBonoSeleccionadoId] = useState<string>('');

  // Log temporal para debugging
  useEffect(() => {
    console.log('[modal] bonoSeleccionadoId updated:', bonoSeleccionadoId);
  }, [bonoSeleccionadoId]);
  const [bonos, setBonos] = useState<{ id: string; codigo: string; nombre: string; monto: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargarItems = async () => {
      try {
        const response = await fetch('/api/payroll/items/opciones?tipo=haber');
        const data = await response.json();
        if (response.ok) {
          const opts = (data.items ?? []).filter((it: SueldoItem) => it.codigo.toLowerCase() !== 'sueldo_base');
          setBonosOpcionales(opts);
        }
      } catch (_) {}
    };
    cargarItems();
  }, []);

  const bonoSeleccionadoData = bonosOpcionales.find(i => i.id === bonoSeleccionadoId);

  const addBono = () => {
    console.log('[modal] addBono called, bonoSeleccionadoId:', bonoSeleccionadoId);
    if (!bonoSeleccionadoData) {
      console.log('[modal] no bonoSeleccionadoData found');
      return;
    }
    if (bonos.some(b => b.id === bonoSeleccionadoData.id)) {
      console.log('[modal] bono already exists');
      return;
    }
    console.log('[modal] adding bono:', bonoSeleccionadoData);
    setBonos([...bonos, { id: bonoSeleccionadoData.id, codigo: bonoSeleccionadoData.codigo, nombre: bonoSeleccionadoData.nombre, monto: '' }]);
    setBonoSeleccionadoId('');
  };

  const removeBono = (id: string) => setBonos(bonos.filter(b => b.id !== id));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instalacionId || !rolServicioId || sueldoBase === '' || sueldoBase === undefined) return;
    setLoading(true);
    try {
      const payload = {
        instalacion_id: instalacionId,
        rol_servicio_id: rolServicioId,
        vigencia_desde: format(vigenciaDesde, 'yyyy-MM-dd'),
        sueldo_base: Number(sueldoBase),
        items: bonos
          .map(b => ({ item_id: b.id, monto: Number(b.monto || '0') }))
          .filter(x => !Number.isNaN(x.monto)),
      };
      const res = await fetch('/api/payroll/estructuras/instalacion/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          onError(json?.error || 'Ya existe una estructura activa o solapada para ese período.');
        } else {
          onError(json?.error || 'Error al crear la estructura');
        }
        return;
      }
      onSuccess();
    } catch (e: any) {
      onError('Error al crear la estructura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Sueldo base *</Label>
        <Input type="number" min={0} value={sueldoBase} onChange={e => setSueldoBase(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Vigente desde *</Label>
        <Popover modal={false}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
              <CalendarIcon className="mr-2 h-4 w-4" /> {format(vigenciaDesde, 'dd/MM/yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom">
            <Calendar mode="single" selected={vigenciaDesde} onSelect={(d) => d && setVigenciaDesde(d)} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Bonos opcionales (HÁBER)</Label>
        <div className="space-y-2">
                  <Combobox
          items={bonosOpcionales}
          value={bonoSeleccionadoId}
          onChange={setBonoSeleccionadoId}
          placeholder="Buscar y seleccionar ítem..."
          searchPlaceholder="Buscar por nombre o código..."
          emptyMessage="No se encontraron ítems de tipo HÁBERES."
        />
          {bonoSeleccionadoData && (
            <div className="p-2 bg-muted rounded text-xs">
              <span className="font-medium">{bonoSeleccionadoData.nombre}</span>
              <span className="text-muted-foreground ml-2">• {bonoSeleccionadoData.codigo}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={addBono} disabled={!bonoSeleccionadoId || !bonoSeleccionadoData}>Agregar bono</Button>
        </div>
        {bonos.length > 0 && (
          <div className="space-y-2">
            {bonos.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{b.nombre}</div>
                  <div className="text-xs text-muted-foreground">{b.codigo}</div>
                </div>
                <Input
                  type="number"
                  placeholder="Monto"
                  value={b.monto}
                  onChange={(e) => setBonos(prev => prev.map(x => x.id === b.id ? { ...x, monto: e.target.value } : x))}
                  className="w-32"
                />
                <Button type="button" variant="ghost" onClick={() => removeBono(b.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Authorize resource="payroll" action="create" eff={effectivePermissions}>
  <GuardButton resource="payroll" action="create" eff={effectivePermissions}  type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear estructura'}</GuardButton>
</Authorize>
      </div>
    </form>
  );
}

// Formulario de edición/eliminación de sueldo base
function SueldoBaseForm({ estructuraId, baseItem, periodoMes, onSuccess, onDeleted, onError }: { estructuraId: string; baseItem: EstructuraItem | null; periodoMes: Date; onSuccess: () => void; onDeleted: () => void; onError: (msg: string) => void; }) {
  const [monto, setMonto] = useState<string>(baseItem ? String(baseItem.monto) : '0');
  const defaultDesde = baseItem ? new Date(baseItem.vigencia_desde) : new Date(periodoMes.getFullYear(), periodoMes.getMonth(), 1);
  const [vigenciaDesde, setVigenciaDesde] = useState<Date>(defaultDesde);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/estructuras/instalacion/sueldo-base/${estructuraId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: Number(monto), vigencia_desde: format(vigenciaDesde, 'yyyy-MM-dd') })
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) onError(json?.error || 'El sueldo_base se solapa con otro período.');
        else onError(json?.error || 'Error al actualizar sueldo base');
        return;
      }
      onSuccess();
    } catch (_) {
      onError('Error al actualizar sueldo base');
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async () => {
    const ok = window.confirm('¿Eliminar sueldo base?');
    if (!ok) return;
    try {
      const res = await fetch(`/api/payroll/estructuras/instalacion/sueldo-base/${estructuraId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        onError(json?.error || 'No se pudo eliminar');
        return;
      }
      onDeleted();
    } catch (_) {
      onError('No se pudo eliminar');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Monto *</Label>
        <Input type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Vigente desde *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
              <CalendarIcon className="mr-2 h-4 w-4" /> {format(vigenciaDesde, 'dd/MM/yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={vigenciaDesde} onSelect={(d) => d && setVigenciaDesde(d)} initialFocus />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex justify-between pt-2">
        <Authorize resource="payroll" action="delete" eff={effectivePermissions}>
  <GuardButton resource="payroll" action="delete" eff={effectivePermissions}  type="button" variant="destructive" onClick={eliminar} disabled={!baseItem}>Eliminar</GuardButton>
</Authorize>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

// Formulario de creación sin calendario (prueba)
function CreateEstructuraFormNoCalendar({ instalacionId, rolServicioId, periodoMes, onSuccess, onError }: { instalacionId: string; rolServicioId: string; periodoMes: Date; onSuccess: () => void; onError: (msg: string) => void; }) {
  const [sueldoBase, setSueldoBase] = useState<string>('0');
  const [vigenciaDesdeStr, setVigenciaDesdeStr] = useState<string>(format(new Date(periodoMes.getFullYear(), periodoMes.getMonth(), 1), 'yyyy-MM-dd'));
  const [bonosOpcionales, setBonosOpcionales] = useState<SueldoItem[]>([]);
  const [bonoSeleccionadoId, setBonoSeleccionadoId] = useState<string>('');
  const [bonos, setBonos] = useState<{ id: string; codigo: string; nombre: string; monto: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargarItems = async () => {
      try {
        const response = await fetch('/api/payroll/items/opciones?tipo=haber');
        const data = await response.json();
        if (response.ok) {
          const opts = (data.items ?? []).filter((it: SueldoItem) => it.codigo.toLowerCase() !== 'sueldo_base');
          setBonosOpcionales(opts);
        }
      } catch (_) {}
    };
    cargarItems();
  }, []);

  const bonoSeleccionadoData = bonosOpcionales.find(i => i.id === bonoSeleccionadoId);

  const addBono = () => {
    if (!bonoSeleccionadoData) return;
    if (bonos.some(b => b.id === bonoSeleccionadoData.id)) return;
    setBonos([...bonos, { id: bonoSeleccionadoData.id, codigo: bonoSeleccionadoData.codigo, nombre: bonoSeleccionadoData.nombre, monto: '' }]);
    setBonoSeleccionadoId('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instalacionId || !rolServicioId || sueldoBase === '' || sueldoBase === undefined) return;
    setLoading(true);
    try {
      const payload = {
        instalacion_id: instalacionId,
        rol_servicio_id: rolServicioId,
        vigencia_desde: vigenciaDesdeStr,
        sueldo_base: Number(sueldoBase),
        items: bonos
          .map(b => ({ item_id: b.id, monto: Number(b.monto || '0') }))
          .filter(x => !Number.isNaN(x.monto)),
      };
      const res = await fetch('/api/payroll/estructuras/instalacion/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          onError(json?.error || 'Ya existe una estructura activa o solapada para ese período.');
        } else {
          onError(json?.error || 'Error al crear la estructura');
        }
        return;
      }
      onSuccess();
    } catch (e: any) {
      onError('Error al crear la estructura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Sueldo base *</Label>
        <Input type="number" min={0} value={sueldoBase} onChange={e => setSueldoBase(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Vigente desde (YYYY-MM-DD) *</Label>
        <Input
          type="text"
          placeholder="YYYY-MM-DD"
          value={vigenciaDesdeStr}
          onChange={(e) => setVigenciaDesdeStr(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Bonos opcionales (HÁBER)</Label>
        <div className="space-y-2">
          <Combobox
            items={bonosOpcionales}
            value={bonoSeleccionadoId}
            onChange={setBonoSeleccionadoId}
            placeholder="Buscar y seleccionar ítem..."
            searchPlaceholder="Buscar por nombre o código..."
            emptyMessage="No se encontraron ítems de tipo HÁBERES."
          />
          {bonoSeleccionadoData && (
            <div className="p-2 bg-muted rounded text-xs">
              <span className="font-medium">{bonoSeleccionadoData.nombre}</span>
              <span className="text-muted-foreground ml-2">• {bonoSeleccionadoData.codigo}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={addBono} disabled={!bonoSeleccionadoId || !bonoSeleccionadoData}>Agregar bono</Button>
        </div>
        {bonos.length > 0 && (
          <div className="space-y-2">
            {bonos.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{b.nombre}</div>
                  <div className="text-xs text-muted-foreground">{b.codigo}</div>
                </div>
                <Input
                  type="number"
                  placeholder="Monto"
                  value={b.monto}
                  onChange={(e) => setBonos(prev => prev.map(x => x.id === b.id ? { ...x, monto: e.target.value } : x))}
                  className="w-32"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Authorize resource="payroll" action="create" eff={effectivePermissions}>
  <GuardButton resource="payroll" action="create" eff={effectivePermissions}  type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear estructura (sin calendario)'}</GuardButton>
</Authorize>
      </div>
    </form>
  );
}
