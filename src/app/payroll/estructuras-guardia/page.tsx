import { Authorize, GuardButton, can } from '@/lib/authz-ui'
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { CalendarIcon, Plus, Edit, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Guardia {
  id: string;
  nombre: string;
  rut: string;
}

interface EstructuraCabecera {
  id: string;
  guardia_id: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
}

interface EstructuraItem {
  id: string;
  item_id: string;
  codigo: string;
  nombre: string;
  clase: string;
  naturaleza: string;
  monto: number;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  activo: boolean;
}

interface ItemOpcion {
  id: string;
  codigo: string;
  nombre: string;
  clase: string;
  naturaleza: string;
}

export default function EstructurasGuardiaPage() {
  const { toast } = useToast();
  const showError = (msg: string) => toast.error(msg, 'Error');
  const showOk = (msg: string) => toast.success(msg);
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [guardiaSeleccionada, setGuardiaSeleccionada] = useState<string>('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [vigenciaDesdeUI, setVigenciaDesdeUI] = useState(
    `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-01`
  );
  const [estructura, setEstructura] = useState<{ cabecera: EstructuraCabecera; lineas: EstructuraItem[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCerrarDialog, setShowCerrarDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<EstructuraItem | null>(null);
  const [sueldoBase, setSueldoBase] = useState<number>(0);
  const [sueldoBaseVigenciaDesde, setSueldoBaseVigenciaDesde] = useState('');
  const [itemsOpciones, setItemsOpciones] = useState<ItemOpcion[]>([]);
  const [nuevoItem, setNuevoItem] = useState({
    item_id: '',
    monto: 0,
    vigencia_desde: '',
    vigencia_hasta: ''
  });

  // Cargar guardias al montar el componente
  useEffect(() => {
    cargarGuardias();
  }, []);

  // Cargar estructura cuando cambian los filtros
  useEffect(() => {
    if (guardiaSeleccionada) {
      cargarEstructura();
    }
  }, [guardiaSeleccionada, anio, mes]);

  // Actualizar fecha "Vigente desde" cuando cambian año o mes
  useEffect(() => {
    setVigenciaDesdeUI(`${anio}-${mes.toString().padStart(2, '0')}-01`);
  }, [anio, mes]);

  const cargarGuardias = async () => {
    try {
      const response = await fetch('/api/guardias');
      if (response.ok) {
        const data = await response.json();
        setGuardias(data.guardias || []);
      }
    } catch (error) {
      console.error('Error al cargar guardias:', error);
    }
  };

  const cargarEstructura = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/payroll/estructuras-guardia?guardia_id=${guardiaSeleccionada}&anio=${anio}&mes=${mes}`
      );
      
      if (response.status === 404) {
        setEstructura(null);
      } else if (response.ok) {
        const data = await response.json();
        setEstructura(data);
        
        // Buscar sueldo base
        const sueldoBaseItem = data.lineas.find((item: EstructuraItem) => item.codigo === 'sueldo_base');
        if (sueldoBaseItem) {
          setSueldoBase(sueldoBaseItem.monto);
          setSueldoBaseVigenciaDesde(sueldoBaseItem.vigencia_desde);
        } else {
          setSueldoBase(0);
          setSueldoBaseVigenciaDesde('');
        }
      }
    } catch (error) {
      console.error('Error al cargar estructura:', error);
      showError('Error al cargar la estructura');
    } finally {
      setLoading(false);
    }
  };

  const crearEstructura = async () => {
    if (!guardiaSeleccionada) {
      showError('Selecciona un guardia');
      return;
    }
    if (!vigenciaDesdeUI) {
      showError('Selecciona la fecha "Vigente desde"');
      return;
    }
    try {
      const response = await fetch('/api/payroll/estructuras-guardia/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardia_id: guardiaSeleccionada,
          vigencia_desde: vigenciaDesdeUI
        })
      });

      if (response.status === 409) {
        const data = await response.json();
        showError(data.message || 'Ya existe una estructura vigente');
      } else if (response.ok) {
        await cargarEstructura();
        showOk('Estructura creada');
      } else {
        const data = await response.json();
        showError(data.message || 'Error al crear la estructura');
      }
    } catch (error) {
      console.error('Error al crear estructura:', error);
      showError('Error al crear la estructura');
    }
  };

  const cerrarEstructura = async () => {
    if (!estructura) return;
    
    try {
      const ultimoDia = new Date(anio, mes, 0).getDate();
      const vigenciaHasta = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDia}`;
      
      const response = await fetch(`/api/payroll/estructuras-guardia/${estructura.cabecera.id}/cerrar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vigencia_hasta: vigenciaHasta })
      });

      if (response.ok) {
        setShowCerrarDialog(false);
        await cargarEstructura();
        showOk('Estructura cerrada');
      } else {
        const data = await response.json();
        showError(data.message || data.error || 'Error al cerrar la estructura');
      }
    } catch (error) {
      console.error('Error al cerrar estructura:', error);
      showError('Error al cerrar la estructura');
    }
  };

  const guardarSueldoBase = async () => {
    if (!estructura || sueldoBase <= 0) return;

    try {
      const vigenciaDesde = sueldoBaseVigenciaDesde || `${anio}-${mes.toString().padStart(2, '0')}-01`;
      
      // Buscar si ya existe sueldo_base
      const sueldoBaseExistente = estructura.lineas.find(item => item.codigo === 'sueldo_base');
      
      const url = sueldoBaseExistente 
        ? `/api/payroll/estructuras-guardia/items/${sueldoBaseExistente.id}`
        : '/api/payroll/estructuras-guardia/items';
      
      const method = sueldoBaseExistente ? 'PUT' : 'POST';
      const body = sueldoBaseExistente 
        ? { monto: sueldoBase, vigencia_desde: vigenciaDesde, vigencia_hasta: null }
        : { 
            estructura_id: estructura.cabecera.id, 
            item_id: 'sueldo_base', 
            monto: sueldoBase, 
            vigencia_desde: vigenciaDesde, 
            vigencia_hasta: null 
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await cargarEstructura();
        showOk('Sueldo base guardado');
      } else {
        const data = await response.json();
        showError(data.message || 'Error al guardar sueldo base');
      }
    } catch (error) {
      console.error('Error al guardar sueldo base:', error);
      showError('Error al guardar sueldo base');
    }
  };

  const cargarItemsOpciones = async (query = '') => {
    try {
      const response = await fetch(`/api/payroll/items/opciones?tipo=haber&q=${query}`);
      if (response.ok) {
        const data = await response.json();
        setItemsOpciones(data.items || []);
      }
    } catch (error) {
      console.error('Error al cargar opciones de items:', error);
    }
  };

  const guardarItem = async () => {
    if (!estructura || !nuevoItem.item_id || nuevoItem.monto <= 0) return;

    try {
      const vigenciaDesde = nuevoItem.vigencia_desde || `${anio}-${mes.toString().padStart(2, '0')}-01`;
      
      const url = editingItem 
        ? `/api/payroll/estructuras-guardia/items/${editingItem.id}`
        : '/api/payroll/estructuras-guardia/items';
      
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem 
        ? { monto: nuevoItem.monto, vigencia_desde: vigenciaDesde, vigencia_hasta: nuevoItem.vigencia_hasta || null }
        : { 
            estructura_id: estructura.cabecera.id, 
            item_id: nuevoItem.item_id, 
            monto: nuevoItem.monto, 
            vigencia_desde: vigenciaDesde, 
            vigencia_hasta: nuevoItem.vigencia_hasta || null 
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowItemDialog(false);
        setEditingItem(null);
        setNuevoItem({ item_id: '', monto: 0, vigencia_desde: '', vigencia_hasta: '' });
        await cargarEstructura();
        showOk('Ítem guardado');
      } else {
        const data = await response.json();
        showError(data.message || 'Error al guardar ítem');
      }
    } catch (error) {
      console.error('Error al guardar item:', error);
      showError('Error al guardar ítem');
    }
  };

  const desactivarItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/payroll/estructuras-guardia/items/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await cargarEstructura();
        showOk('Ítem desactivado');
      }
    } catch (error) {
      console.error('Error al desactivar item:', error);
      showError('Error al desactivar ítem');
    }
  };

  const editarItem = (item: EstructuraItem) => {
    setEditingItem(item);
    setNuevoItem({
      item_id: item.item_id,
      monto: item.monto,
      vigencia_desde: item.vigencia_desde,
      vigencia_hasta: item.vigencia_hasta || ''
    });
    setShowItemDialog(true);
  };

  const abrirNuevoItem = () => {
    setEditingItem(null);
    setNuevoItem({
      item_id: '',
      monto: 0,
      vigencia_desde: '',
      vigencia_hasta: ''
    });
    cargarItemsOpciones();
    setShowItemDialog(true);
  };

  const sueldoBaseExistente = estructura?.lineas.find(item => item.codigo === 'sueldo_base');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Estructuras por Guardia</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="guardia">Guardia</Label>
              <Select value={guardiaSeleccionada} onValueChange={setGuardiaSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar guardia" />
                </SelectTrigger>
                <SelectContent>
                  {guardias.map((guardia) => (
                    <SelectItem key={guardia.id} value={guardia.id}>
                      {guardia.nombre} - {guardia.rut}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="anio">Año</Label>
              <Input
                id="anio"
                type="number"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                min={2020}
                max={2030}
              />
            </div>
            
            <div>
              <Label htmlFor="mes">Mes</Label>
              <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                    <SelectItem key={mes} value={mes.toString()}>
                      {format(new Date(2024, mes - 1), 'MMMM', { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vigente-desde">Vigente desde</Label>
              <Input
                id="vigente-desde"
                type="date"
                value={vigenciaDesdeUI}
                onChange={(e) => setVigenciaDesdeUI(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : !estructura ? (
        /* Estado sin cabecera vigente */
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-gray-500">
                <CalendarIcon className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium">No hay estructura personal vigente</h3>
                <p className="text-sm">Para el período seleccionado no existe una estructura personal</p>
              </div>
              <Button onClick={crearEstructura} disabled={!guardiaSeleccionada || !/^\d{4}-\d{2}-\d{2}$/.test(vigenciaDesdeUI)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear estructura personal
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Estado con cabecera */
        <div className="space-y-6">
          {/* Header de la estructura */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Estructura Personal</CardTitle>
                  <p className="text-sm text-gray-600">
                    Vigente desde {format(new Date(estructura.cabecera.vigencia_desde), 'dd/MM/yyyy')} 
                    {estructura.cabecera.vigencia_hasta 
                      ? ` hasta ${format(new Date(estructura.cabecera.vigencia_hasta), 'dd/MM/yyyy')}`
                      : ' (actual)'
                    }
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCerrarDialog(true)}
                  disabled={!!estructura.cabecera.vigencia_hasta}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cerrar estructura
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Sueldo Base */}
          <Card>
            <CardHeader>
              <CardTitle>Sueldo Base</CardTitle>
            </CardHeader>
            <CardContent>
              {sueldoBaseExistente ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">${sueldoBaseExistente.monto.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">
                      Vigente desde {format(new Date(sueldoBaseExistente.vigencia_desde), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sueldo-base">Monto</Label>
                      <Input
                        id="sueldo-base"
                        type="number"
                        value={sueldoBase}
                        onChange={(e) => setSueldoBase(parseInt(e.target.value) || 0)}
                        placeholder="Ingrese monto"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vigencia-desde">Vigente desde</Label>
                      <Input
                        id="vigencia-desde"
                        type="date"
                        value={sueldoBaseVigenciaDesde}
                        onChange={(e) => setSueldoBaseVigenciaDesde(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={guardarSueldoBase} disabled={sueldoBase <= 0}>
                    Guardar Sueldo Base
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla de líneas */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Líneas de Haberes</CardTitle>
                <Button onClick={abrirNuevoItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Línea
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Vigencia Desde</TableHead>
                    <TableHead>Vigencia Hasta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estructura.lineas
                    .filter(item => item.codigo !== 'sueldo_base')
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.codigo}</TableCell>
                        <TableCell>{item.nombre}</TableCell>
                        <TableCell>${item.monto.toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(item.vigencia_desde), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          {item.vigencia_hasta 
                            ? format(new Date(item.vigencia_hasta), 'dd/MM/yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.activo ? 'default' : 'secondary'}>
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editarItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => desactivarItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Cerrar Estructura */}
      <Dialog open={showCerrarDialog} onOpenChange={setShowCerrarDialog}>
        <DialogContent aria-describedby="cerrar-estructura-description">
          <DialogHeader>
            <DialogTitle>Cerrar Estructura Personal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p id="cerrar-estructura-description" className="text-sm text-gray-600">
              Se cerrará la estructura hasta el último día del mes seleccionado.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCerrarDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={cerrarEstructura}>
                Cerrar Estructura
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Item */}
      <Dialog open={showItemDialog} onOpenChange={(open) => { setShowItemDialog(open); if (open) { cargarItemsOpciones(); } }}>
        <DialogContent className="max-w-md" aria-describedby="item-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Línea' : 'Agregar Línea'}
            </DialogTitle>
          </DialogHeader>
          <div id="item-dialog-description" className="space-y-4">
            <div>
              <Label htmlFor="item">Ítem</Label>
              <Select 
                value={nuevoItem.item_id} 
                onValueChange={(value) => {
                  setNuevoItem(prev => ({ ...prev, item_id: value }));
                  cargarItemsOpciones();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ítem" />
                </SelectTrigger>
                <SelectContent>
                  {itemsOpciones
                    .filter(item => item.codigo !== 'sueldo_base' || !sueldoBaseExistente)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.codigo} - {item.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                value={nuevoItem.monto}
                onChange={(e) => setNuevoItem(prev => ({ ...prev, monto: parseInt(e.target.value) || 0 }))}
                placeholder="Ingrese monto"
              />
            </div>
            
            <div>
              <Label htmlFor="vigencia-desde">Vigente desde</Label>
              <Input
                id="vigencia-desde"
                type="date"
                value={nuevoItem.vigencia_desde}
                onChange={(e) => setNuevoItem(prev => ({ ...prev, vigencia_desde: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="vigencia-hasta">Vigente hasta (opcional)</Label>
              <Input
                id="vigencia-hasta"
                type="date"
                value={nuevoItem.vigencia_hasta}
                onChange={(e) => setNuevoItem(prev => ({ ...prev, vigencia_hasta: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowItemDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={guardarItem} disabled={!nuevoItem.item_id || nuevoItem.monto <= 0}>
                {editingItem ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
