'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

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
  item_id: string;
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

  // Cargar datos iniciales
  useEffect(() => {
    cargarInstalaciones();
    cargarRolesServicio();
    cargarItemsGlobales();
  }, []);

  // Cargar estructura cuando cambian los filtros
  useEffect(() => {
    if (selectedInstalacion && selectedRol) {
      cargarEstructura();
    }
  }, [selectedInstalacion, selectedRol]);

  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/instalaciones?activo=true');
      const data = await response.json();
      if (data.success) {
        setInstalaciones(data.data);
      }
    } catch (error) {
      console.error('Error cargando instalaciones:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las instalaciones",
        variant: "destructive",
      });
    }
  };

  const cargarRolesServicio = async () => {
    try {
      const response = await fetch('/api/roles-servicio?activo=true');
      const data = await response.json();
      if (data.success) {
        setRolesServicio(data.data);
      }
    } catch (error) {
      console.error('Error cargando roles de servicio:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los roles de servicio",
        variant: "destructive",
      });
    }
  };

  const cargarItemsGlobales = async () => {
    try {
      const response = await fetch('/api/payroll/items?activo=true');
      const data = await response.json();
      if (data.success) {
        setItemsGlobales(data.data);
      }
    } catch (error) {
      console.error('Error cargando ítems globales:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los ítems globales",
        variant: "destructive",
      });
    }
  };

  const cargarEstructura = async () => {
    if (!selectedInstalacion || !selectedRol) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/payroll/estructuras/instalacion?instalacion_id=${selectedInstalacion}&rol_servicio_id=${selectedRol}`
      );
      const data = await response.json();
      if (data.success) {
        setEstructura(data.data);
      } else {
        setEstructura(null);
      }
    } catch (error) {
      console.error('Error cargando estructura:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la estructura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarItem = () => {
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
        toast({
          title: "Éxito",
          description: "Ítem desactivado correctamente",
        });
        cargarEstructura();
      }
    } catch (error) {
      console.error('Error desactivando ítem:', error);
      toast({
        title: "Error",
        description: "No se pudo desactivar el ítem",
        variant: "destructive",
      });
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
              <Select value={selectedRol} onValueChange={setSelectedRol}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
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
              <Popover>
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
                <PopoverContent className="w-auto p-0">
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
              <Button onClick={handleAgregarItem} disabled={!estructura}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Línea
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando estructura...</div>
            ) : estructura ? (
              <div className="space-y-4">
                {/* Información de la estructura */}
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
                    No hay ítems en esta estructura
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No se encontró una estructura para los filtros seleccionados
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal para agregar/editar ítem */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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

  useEffect(() => {
    if (editingItem) {
      setSelectedItem(editingItem.item_id);
      setMonto(editingItem.monto.toString());
      setVigenciaDesde(new Date(editingItem.vigencia_desde));
      setVigenciaHasta(editingItem.vigencia_hasta ? new Date(editingItem.vigencia_hasta) : undefined);
    }
  }, [editingItem]);

  const selectedItemData = items.find(item => item.id === selectedItem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !monto || !vigenciaDesde) return;

    setLoading(true);
    try {
      const url = editingItem 
        ? `/api/payroll/estructuras/instalacion/items/${editingItem.id}`
        : '/api/payroll/estructuras/instalacion/items';
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instalacion_id: instalacionId,
          rol_servicio_id: rolServicioId,
          item_id: selectedItem,
          monto: parseFloat(monto),
          vigencia_desde: format(vigenciaDesde, 'yyyy-MM-dd'),
          vigencia_hasta: vigenciaHasta ? format(vigenciaHasta, 'yyyy-MM-dd') : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Éxito",
          description: editingItem ? "Línea actualizada correctamente" : "Línea agregada correctamente",
        });
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al guardar la línea",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error guardando ítem:', error);
      toast({
        title: "Error",
        description: "Error al guardar la línea",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="item">Ítem *</Label>
        <Select value={selectedItem} onValueChange={setSelectedItem}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar ítem" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex items-center space-x-2">
                  <span>{item.nombre}</span>
                  <Badge variant={item.clase === 'HABER' ? 'default' : 'secondary'} className="text-xs">
                    {item.clase}
                  </Badge>
                  <Badge variant={item.naturaleza === 'IMPONIBLE' ? 'default' : 'outline'} className="text-xs">
                    {item.naturaleza}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Popover>
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
          <PopoverContent className="w-auto p-0">
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
        <Popover>
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
          <PopoverContent className="w-auto p-0">
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
