'use client';

import { can } from '@/lib/authz-ui'
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SueldoItem, SueldoItemFormData, SueldoItemStats } from '@/lib/schemas/sueldo-item';
import BackToPayroll from '@/components/BackToPayroll';

export default function ItemsGlobalesClient() {
  const [items, setItems] = useState<SueldoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClase, setFilterClase] = useState<string>('all');
  const [filterNaturaleza, setFilterNaturaleza] = useState<string>('all');
  const [filterActivo, setFilterActivo] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<SueldoItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SueldoItemFormData>({
    nombre: '',
    clase: 'HABER',
    naturaleza: 'IMPONIBLE',
    descripcion: '',
    formula_json: null,
    tope_modo: 'NONE',
    tope_valor: undefined,
    activo: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Cargar ítems
  const loadItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterActivo !== 'all') params.append('activo', filterActivo);
      if (filterClase !== 'all') params.append('clase', filterClase);
      if (filterNaturaleza !== 'all') params.append('naturaleza', filterNaturaleza);

      console.log('🔍 Cargando ítems desde la base de datos...');
      const response = await fetch(`/api/payroll/items?${params.toString()}`);
      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔍 Result:', result);

      if (result.success) {
        setItems(result.data);
        console.log('🔍 Items cargados desde BD:', result.data.length);
      } else {
        console.error('🔍 Error en respuesta:', result);
        toast({
          title: "Error",
          description: "No se pudieron cargar los ítems globales",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('🔍 Error cargando ítems:', error);
      toast({
        title: "Error",
        description: "Error al cargar los ítems globales",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Guardar ítem
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingItem 
        ? `/api/payroll/items/${editingItem.id}`
        : '/api/payroll/items';
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: editingItem 
            ? "Ítem actualizado exitosamente" 
            : "Ítem creado exitosamente",
        });
        setIsDialogOpen(false);
        loadItems();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al guardar el ítem",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error guardando ítem:', error);
      toast({
        title: "Error",
        description: "Error al guardar el ítem",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar ítem
  const handleDelete = async (item: SueldoItem) => {
    if (!confirm('¿Estás seguro de que quieres desactivar este ítem?')) {
      return;
    }

    try {
      const response = await fetch(`/api/payroll/items/${item.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: "Ítem desactivado exitosamente",
        });
        loadItems();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al desactivar el ítem",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error eliminando ítem:', error);
      toast({
        title: "Error",
        description: "Error al desactivar el ítem",
        variant: "destructive"
      });
    }
  };

  // Activar/Desactivar ítem
  const handleToggleActive = async (item: SueldoItem) => {
    try {
      const response = await fetch(`/api/payroll/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !item.activo }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Éxito",
          description: item.activo 
            ? "Ítem desactivado exitosamente" 
            : "Ítem activado exitosamente",
        });
        loadItems();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al cambiar el estado del ítem",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toast({
        title: "Error",
        description: "Error al cambiar el estado del ítem",
        variant: "destructive"
      });
    }
  };

  // Abrir diálogo para editar
  const handleEdit = (item: SueldoItem) => {
    setEditingItem(item);
    setFormData({
      nombre: item.nombre,
      clase: item.clase,
      naturaleza: item.naturaleza,
      descripcion: item.descripcion || '',
      formula_json: item.formula_json,
      tope_modo: item.tope_modo,
      tope_valor: item.tope_valor,
      activo: item.activo
    });
    setIsDialogOpen(true);
  };

  // Abrir diálogo para crear nuevo
  const handleCreate = () => {
    setEditingItem(null);
    resetForm();
    setIsDialogOpen(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      clase: 'HABER',
      naturaleza: 'IMPONIBLE',
      descripcion: '',
      formula_json: null,
      tope_modo: 'NONE',
      tope_valor: undefined,
      activo: true
    });
  };

  // Filtrar ítems
  const filteredItems = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Calcular estadísticas
  const stats: SueldoItemStats = {
    totalItems: items.length,
    itemsActivos: items.filter(i => i.activo).length,
    itemsInactivos: items.filter(i => !i.activo).length,
    itemsImponibles: items.filter(i => i.naturaleza === 'IMPONIBLE').length,
    itemsNoImponibles: items.filter(i => i.naturaleza === 'NO_IMPONIBLE').length,
    itemsHaberes: items.filter(i => i.clase === 'HABER').length,
    itemsDescuentos: items.filter(i => i.clase === 'DESCUENTO').length
  };

  useEffect(() => {
    loadItems();
  }, []); // Solo ejecutar una vez al montar

  useEffect(() => {
    // Recargar cuando cambien los filtros
    if (items.length > 0) { // Solo recargar si ya hay datos
      loadItems();
    }
  }, [filterActivo, filterClase, filterNaturaleza]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackToPayroll />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ítems Globales</h1>
          <p className="text-muted-foreground">
            Administra los ítems de sueldo disponibles para las estructuras de servicio
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Ítem
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.itemsActivos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.itemsInactivos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.itemsImponibles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Imponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.itemsNoImponibles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Haberes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.itemsHaberes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Descuentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.itemsDescuentos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clase">Clase</Label>
              <Select value={filterClase} onValueChange={setFilterClase}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las clases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las clases</SelectItem>
                  <SelectItem value="HABER">Haberes</SelectItem>
                  <SelectItem value="DESCUENTO">Descuentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="naturaleza">Naturaleza</Label>
              <Select value={filterNaturaleza} onValueChange={setFilterNaturaleza}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las naturalezas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las naturalezas</SelectItem>
                  <SelectItem value="IMPONIBLE">Imponibles</SelectItem>
                  <SelectItem value="NO_IMPONIBLE">No Imponibles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activo">Estado</Label>
              <Select value={filterActivo} onValueChange={setFilterActivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de ítems */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ítems Globales</span>
            <Button 
              onClick={loadItems} 
              disabled={loading}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron ítems
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Clase</TableHead>
                  <TableHead>Naturaleza</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.nombre}</div>
                        {item.descripcion && (
                          <div className="text-sm text-muted-foreground">{item.descripcion}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.codigo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.clase === 'HABER' ? 'default' : 'secondary'}>
                        {item.clase}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.naturaleza === 'IMPONIBLE' ? 'default' : 'outline'}>
                        {item.naturaleza}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.activo}
                          onCheckedChange={() => handleToggleActive(item)}
                        />
                        <span className="text-sm">
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para crear/editar ítem */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Ítem' : 'Nuevo Ítem'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clase">Clase *</Label>
                <Select value={formData.clase} onValueChange={(value) => setFormData({ ...formData, clase: value as 'HABER' | 'DESCUENTO' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HABER">Haber</SelectItem>
                    <SelectItem value="DESCUENTO">Descuento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="naturaleza">Naturaleza *</Label>
                <Select value={formData.naturaleza} onValueChange={(value) => setFormData({ ...formData, naturaleza: value as 'IMPONIBLE' | 'NO_IMPONIBLE' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMPONIBLE">Imponible</SelectItem>
                    <SelectItem value="NO_IMPONIBLE">No Imponible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activo">Estado</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                  <Label htmlFor="activo">{formData.activo ? 'Activo' : 'Inactivo'}</Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional del ítem..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Crear')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
