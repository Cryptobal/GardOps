'use client';

import { can } from '@/lib/authz-ui'
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Edit, Trash2, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import BackToPayroll from '@/components/BackToPayroll';

interface Guardia {
  id: string;
  nombre: string;
  rut: string;
  nombre_completo: string;
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

interface EstructuraGuardia {
  id: string;
  guardia_id: string;
  guardia_nombre: string;
  guardia_rut: string;
  version: number;
  vigencia_desde: string;
  activo: boolean;
  items: EstructuraItem[];
}

// Determina si un ítem está vigente en la fecha indicada (ignora el flag activo)
function isItemEffectiveActive(item: EstructuraItem, fechaCorte: Date): boolean {
  const inicio = new Date(item.vigencia_desde);
  const fin = item.vigencia_hasta ? new Date(item.vigencia_hasta) : null;
  return inicio <= fechaCorte && (!fin || fechaCorte <= fin);
}

export default function EstructurasGuardiaPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [itemsGlobales, setItemsGlobales] = useState<SueldoItem[]>([]);
  const [estructura, setEstructura] = useState<EstructuraGuardia | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGuardia, setSelectedGuardia] = useState<string>('');
  const [periodoMes, setPeriodoMes] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstructuraItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [baseDialogOpen, setBaseDialogOpen] = useState(false);
  const [inactivarDialogOpen, setInactivarDialogOpen] = useState(false);
  const [showInactiveItems, setShowInactiveItems] = useState(true);
  const [allStructures, setAllStructures] = useState<any[]>([]);
  const [showInactiveStructures, setShowInactiveStructures] = useState(false);
  const inactiveStructures = useMemo(() => (allStructures || []).filter((e: any) => !e.activo), [allStructures]);
  const [loadingInactiveList, setLoadingInactiveList] = useState(false);
  const [inactiveDetails, setInactiveDetails] = useState<Record<string, { loading: boolean; items: any[] }>>({});
  const [expandedInactive, setExpandedInactive] = useState<Record<string, boolean>>({});
  const [editingInactiveId, setEditingInactiveId] = useState<string | null>(null);
  const [deletingInactiveId, setDeletingInactiveId] = useState<string | null>(null);
  const [showStructureInfo, setShowStructureInfo] = useState(false);

  const cargarEstructurasInactivas = async () => {
    if (!showInactiveStructures) return;
    setLoadingInactiveList(true);
    try {
      const res = await fetch(`/api/payroll/estructuras-guardia/list?guardia_id=${selectedGuardia}`);
      const json = await res.json();
      if (json.success) {
        setAllStructures(json.data.estructuras || []);
      }
    } catch (e) {
      console.error('Error cargando estructuras inactivas:', e);
    } finally {
      setLoadingInactiveList(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarGuardias();
    cargarItemsGlobales();
  }, []);

  // Cargar estructura cuando cambian los filtros
  useEffect(() => {
    if (selectedGuardia) {
      cargarEstructura();
    }
  }, [selectedGuardia, periodoMes, showInactiveItems]);

  // Cargar estructuras inactivas cuando el switch está activo
  useEffect(() => {
    const load = async () => {
      if (!selectedGuardia) return;
      if (!showInactiveStructures) {
        setAllStructures([]);
        return;
      }
      setLoadingInactiveList(true);
      console.log('🔍 Cargando estructuras inactivas...', { selectedGuardia, showInactiveStructures });
      try {
        const res = await fetch(`/api/payroll/estructuras-guardia/list?guardia_id=${selectedGuardia}`);
        const json = await res.json();
        console.log('🔍 Respuesta de estructuras:', json);
        if (json.success) {
          const estructuras = json.data.estructuras || [];
          console.log('🔍 Estructuras cargadas:', estructuras);
          setAllStructures(estructuras);
      }
    } catch (error) {
        console.error('Error cargando estructuras inactivas:', error);
      } finally {
        setLoadingInactiveList(false);
      }
    };
    load();
  }, [showInactiveStructures, selectedGuardia]);

  const cargarGuardias = async () => {
    try {
      const response = await fetch('/api/guardias?activo=true');
        const data = await response.json();
      if (data.success) {
        // Asegurar que los guardias tengan nombre_completo
        const guardiasConNombre = (data.data || []).map((guardia: any) => ({
          ...guardia,
          nombre_completo: guardia.nombre_completo || 
            `${guardia.nombre || ''} ${guardia.apellido_paterno || ''} ${guardia.apellido_materno || ''}`.trim() || 
            guardia.nombre || 'Sin nombre'
        }));
        setGuardias(guardiasConNombre);
      }
    } catch (error) {
      console.error('Error cargando guardias:', error);
      toastError("Error", "No se pudieron cargar los guardias");
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
    if (!selectedGuardia) return;
    
    setLoading(true);
    try {
      const anio = periodoMes.getFullYear();
      const mes = periodoMes.getMonth() + 1;
      
      const response = await fetch(
        `/api/payroll/estructuras-guardia?guardia_id=${selectedGuardia}&anio=${anio}&mes=${mes}&include_inactive=${showInactiveItems}`
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
      setEstructura(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarItem = () => {
    if (estructura) {
      setEditingItem(null);
      setDialogOpen(true);
    } else {
      setCreateDialogOpen(true);
    }
  };

  const handleEditarItem = (item: EstructuraItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };



  const handleGuardarItem = async (formData: any) => {
    try {
      const url = editingItem 
        ? `/api/payroll/estructuras-guardia/items/${editingItem.id}`
        : '/api/payroll/estructuras-guardia/items';
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          estructura_id: estructura?.id
        }),
      });

        const data = await response.json();
      
      if (data.success) {
        toastSuccess("Éxito", editingItem ? "Ítem actualizado exitosamente" : "Ítem agregado exitosamente");
        setDialogOpen(false);
        cargarEstructura();
      } else {
        toastError("Error", data.error || "Error al guardar el ítem");
      }
    } catch (error) {
      console.error('Error guardando ítem:', error);
      toastError("Error", "Error al guardar el ítem");
    }
  };

  const handleInactivarEstructura = async () => {
    if (!estructura) return;
    
    try {
      const response = await fetch(`/api/payroll/estructuras-guardia/${estructura.id}/inactivar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vigencia_hasta: format(new Date(), 'yyyy-MM-dd')
        }),
      });

        const data = await response.json();
      
      if (data.success) {
        toastSuccess("Éxito", "Estructura inactivada exitosamente");
        setInactivarDialogOpen(false);
        cargarEstructura();
      } else {
        toastError("Error", data.error || "Error al inactivar la estructura");
      }
    } catch (error) {
      console.error('Error inactivando estructura:', error);
      toastError("Error", "Error al inactivar la estructura");
    }
  };

  const toggleExpandInactive = (id: string) => {
    setExpandedInactive(prev => ({ ...prev, [id]: !prev[id] }));
    
    if (!inactiveDetails[id] || !inactiveDetails[id]?.loading) {
      setInactiveDetails(prev => ({ ...prev, [id]: { loading: true, items: [] } }));
      
      fetch(`/api/payroll/estructuras-guardia/${id}/items`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setInactiveDetails(prev => ({ 
              ...prev, 
              [id]: { loading: false, items: data.data || [] } 
            }));
          }
        })
        .catch(error => {
          console.error('Error cargando detalle:', error);
          setInactiveDetails(prev => ({ 
            ...prev, 
            [id]: { loading: false, items: [] } 
          }));
        });
    }
  };

  const handleEliminarEstructura = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta estructura? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/payroll/estructuras-guardia/${id}`, {
        method: 'DELETE',
      });

        const data = await response.json();
      
      if (data.success) {
        toastSuccess("Éxito", "Estructura eliminada exitosamente");
        setDeletingInactiveId(null);
        cargarEstructurasInactivas();
      } else {
        toastError("Error", data.error || "Error al eliminar la estructura");
      }
    } catch (error) {
      console.error('Error eliminando estructura:', error);
      toastError("Error", "Error al eliminar la estructura");
    }
  };

  const handleEditarEstructuraInactiva = async (id: string) => {
    // Por ahora, solo mostraremos un mensaje informativo
    // La edición de estructuras inactivas requeriría lógica adicional
    toastError("Info", "La edición de estructuras inactivas no está disponible. Debes crear una nueva estructura.");
    setEditingInactiveId(null);
  };

  const getItemById = (itemId: string) => {
    return itemsGlobales.find(item => item.id === itemId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackToPayroll />
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Estructuras por Guardia</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guardia">Guardia *</Label>
              <Select value={selectedGuardia} onValueChange={setSelectedGuardia}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar guardia" />
                </SelectTrigger>
                <SelectContent>
                  {guardias.map((guardia) => (
                    <SelectItem key={guardia.id} value={guardia.id}>
                      {guardia.nombre_completo} - {guardia.rut}
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
      {selectedGuardia && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Estructura por Guardia
                {estructura && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    - Versión {estructura.version}
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2 items-center">
                <Button onClick={handleAgregarItem} disabled={!selectedGuardia}>
                <Plus className="mr-2 h-4 w-4" />
                {estructura ? 'Agregar Nuevo Bono' : 'Crear estructura por guardia'}
              </Button>
                {/* Switch para mostrar estructuras inactivas */}
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                  <Switch id="show-inactive-structures" checked={showInactiveStructures} onCheckedChange={setShowInactiveStructures} />
                  <Label htmlFor="show-inactive-structures" className="text-sm">Ver estructuras inactivas</Label>
            </div>
                {estructura && (
                <Button 
                  variant="outline" 
                    onClick={() => setInactivarDialogOpen(true)}
                    disabled={!estructura.activo}
                >
                    Inactivar Estructura
                </Button>
                )}
              </div>
              </div>
            </CardHeader>
            <CardContent>
            {showInactiveStructures && (
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-medium">Estructuras Inactivas</h3>
                <div className="grid gap-4">
                  {loadingInactiveList ? (
                    <div className="text-center py-4 text-muted-foreground">Cargando estructuras inactivas...</div>
                  ) : inactiveStructures.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No hay estructuras inactivas para mostrar.</div>
                  ) : (
                    inactiveStructures.map((estructuraInactiva: any) => (
                      <div key={estructuraInactiva.id} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                  <div>
                            <span className="font-medium">Versión: {estructuraInactiva.version}</span>
                            <Badge variant="secondary" className="ml-2">Inactiva</Badge>
                  </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingInactiveId(estructuraInactiva.id)}>
                              <Edit className="h-4 w-4 mr-1" /> Editar
                            </Button>
                            <Button variant="default" size="sm" onClick={() => toggleExpandInactive(estructuraInactiva.id)}>
                              <Eye className="h-4 w-4 mr-1" /> {expandedInactive[estructuraInactiva.id] ? 'Ocultar' : 'Ver detalle'}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => setDeletingInactiveId(estructuraInactiva.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                            </Button>
                </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                            <span className="font-medium">Vigencia Desde:</span>
                            <br />
                            {formatDate(estructuraInactiva.vigencia_desde, "dd/MM/yyyy")}
                    </div>
                    <div>
                            <span className="font-medium">Vigencia Hasta:</span>
                            <br />
                            {formatDate(estructuraInactiva.vigencia_hasta, "dd/MM/yyyy")}
                    </div>
                          <div>
                            <span className="font-medium">Creada:</span>
                            <br />
                            {formatDate(estructuraInactiva.creado_en, "dd/MM/yyyy HH:mm")}
                  </div>
                          <div>
                            <span className="font-medium">Versión:</span>
                            <br />
                            {estructuraInactiva.version || "N/A"}
                </div>
                        </div>
                        {expandedInactive[estructuraInactiva.id] && (
                          <div className="mt-4 p-3 bg-slate-800 border border-slate-700 rounded">
                            {inactiveDetails[estructuraInactiva.id]?.loading ? (
                              <div className="text-sm text-slate-300">Cargando detalle...</div>
                            ) : (
                              <>
                                {/* Sueldo base */}
                                {(() => {
                                  const base = (inactiveDetails[estructuraInactiva.id]?.items || []).find((i: any) => i.item_codigo === 'sueldo_base');
                                  return (
                                    <div className="mb-3">
                                      <div className="text-sm font-medium text-slate-200">Sueldo base</div>
                                      {base ? (
                                        <div className="text-sm">
                                          <span className="font-mono font-semibold text-slate-100">${base.monto?.toLocaleString?.() ?? base.monto}</span>
                                          <span className="ml-2 text-xs text-slate-400">
                                            Desde {formatDate(base.vigencia_desde, 'dd/MM/yyyy')}
                                            {base.vigencia_hasta ? ` • Hasta ${formatDate(base.vigencia_hasta, 'dd/MM/yyyy')}` : ''}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-slate-400">No definido</div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Ítems */}
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-slate-700">
                                      <TableHead className="text-slate-200 font-medium">Ítem</TableHead>
                                      <TableHead className="text-slate-200 font-medium">Clase/Naturaleza</TableHead>
                                      <TableHead className="text-slate-200 font-medium">Monto</TableHead>
                                      <TableHead className="text-slate-200 font-medium">Vigencia</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(inactiveDetails[estructuraInactiva.id]?.items || [])
                                      .filter((it: any) => it.item_codigo !== 'sueldo_base')
                                      .map((it: any) => (
                                        <TableRow key={it.id} className="border-slate-700">
                                          <TableCell>
                                            <div>
                                              <div className="font-medium text-slate-100">{it.item_nombre}</div>
                                              <div className="text-xs text-slate-400">{it.item_codigo}</div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="space-y-1">
                                              <Badge variant={it.item_clase === 'HABER' ? 'default' : 'secondary'}>
                                                {it.item_clase}
                                              </Badge>
                                              <Badge variant={it.item_naturaleza === 'IMPONIBLE' ? 'default' : 'outline'}>
                                                {it.item_naturaleza}
                                              </Badge>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <span className="font-mono font-semibold text-slate-100">${it.monto?.toLocaleString?.() ?? it.monto}</span>
                                          </TableCell>
                                          <TableCell>
                                            <div className="text-sm text-slate-300">
                                              <p>Desde: {formatDate(it.vigencia_desde, 'dd/MM/yyyy')}</p>
                                              {it.vigencia_hasta && <p>Hasta: {formatDate(it.vigencia_hasta, 'dd/MM/yyyy')}</p>}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">Cargando estructura...</div>
            ) : estructura ? (
              <div className="space-y-4">
                {/* Estructura completa colapsable */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between w-full">
                    <button
                      onClick={() => setShowStructureInfo(!showStructureInfo)}
                      className="flex items-center text-left flex-1"
                    >
                      <h3 className="text-lg font-medium">Estructura por Guardia - Versión {estructura.version}</h3>
                      <ChevronRight className={`h-4 w-4 ml-2 transition-transform ${showStructureInfo ? 'rotate-90' : ''}`} />
                    </button>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBaseDialogOpen(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInactivarDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                </Button>
              </div>
                  </div>
                  
                  {showStructureInfo && (
                    <div className="mt-4 space-y-4">
                      {/* Información básica */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-sm font-medium">Guardia</Label>
                          <p className="text-sm">{estructura.guardia_nombre}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">RUT</Label>
                          <p className="text-sm">{estructura.guardia_rut}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Vigencia Desde</Label>
                                                      <p className="text-sm">{formatDate(estructura.vigencia_desde, "dd/MM/yyyy")}</p>
                        </div>
                      </div>

                      {/* Tarjeta de Sueldo base */}
                      <SueldoBaseCard
                        estructura={estructura}
                        periodoMes={periodoMes}
                        onEdit={() => setBaseDialogOpen(true)}
                      />

                      {/* Tabla de ítems (solo bonos) */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Bonos de la Estructura</h3>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show-inactive"
                            checked={showInactiveItems}
                            onCheckedChange={setShowInactiveItems}
                          />
                          <Label htmlFor="show-inactive" className="text-sm">
                            Mostrar inactivos
                          </Label>
                        </div>
                      </div>
              <Table>
                <TableHeader>
                  <TableRow>
                            <TableHead>Bono</TableHead>
                            <TableHead>Clase/Naturaleza</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                          {estructura.items
                            .filter(item => 
                              item.item_codigo !== 'sueldo_base' && 
                              (showInactiveItems || isItemEffectiveActive(item, periodoMes))
                            )
                            .map((item) => {
                            const itemGlobal = getItemById(item.item_id);
                            const isInactive = !isItemEffectiveActive(item, periodoMes);
                            return (
                              <TableRow key={item.id} className={isInactive ? "opacity-50 bg-muted/30" : ""}>
                        <TableCell>
                                  <div>
                                    <p className={`font-medium ${isInactive ? "text-muted-foreground" : ""}`}>
                                      {item.item_nombre}
                                      {isInactive && <span className="ml-2 text-xs text-muted-foreground">(Inactivo)</span>}
                                    </p>
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
                                    ${Math.round(item.monto).toLocaleString('es-CL')}
                                  </span>
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
                                      onClick={() => {
                                        if (confirm('¿Estás seguro de que quieres eliminar este ítem?')) {
                                          // Implementar eliminación
                                        }
                                      }}
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
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay estructura activa para este guardia en el período seleccionado.</p>
              </div>
            )}
            </CardContent>
          </Card>
      )}

      {/* Diálogos */}
      {/* Diálogo para crear estructura */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Estructura por Guardia</DialogTitle>
            <DialogDescription>
              Define el sueldo base y bonos opcionales para la nueva estructura
            </DialogDescription>
          </DialogHeader>
          <CreateEstructuraForm 
            guardiaId={selectedGuardia}
            periodoMes={periodoMes}
            onSuccess={() => {
              setCreateDialogOpen(false);
              cargarEstructura();
              toastSuccess("Éxito", "Estructura creada exitosamente");
            }}
            onError={(msg) => {
              if (msg) {
                toastError("Error", msg);
              } else {
                setCreateDialogOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar sueldo base */}
      <Dialog open={baseDialogOpen} onOpenChange={setBaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sueldo Base</DialogTitle>
          </DialogHeader>
          <SueldoBaseForm 
            estructura={estructura}
            onSubmit={(data) => {
              // Implementar actualización de sueldo base
              setBaseDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo para agregar/editar ítem */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Bono' : 'Agregar Nuevo Bono'}
            </DialogTitle>
          </DialogHeader>
          <ItemForm 
            items={itemsGlobales}
            editingItem={editingItem}
            onSubmit={handleGuardarItem}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo para inactivar estructura */}
      <Dialog open={inactivarDialogOpen} onOpenChange={setInactivarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inactivar Estructura</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres inactivar esta estructura? Esto la marcará como inactiva desde hoy.
            </DialogDescription>
          </DialogHeader>
            <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setInactivarDialogOpen(false)}>
                Cancelar
              </Button>
            <Button variant="destructive" onClick={handleInactivarEstructura}>
              Inactivar
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar estructura inactiva */}
      <Dialog open={!!editingInactiveId} onOpenChange={() => setEditingInactiveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estructura Inactiva</DialogTitle>
            <DialogDescription>
              La edición de estructuras inactivas no está disponible. Para modificar una estructura, debes crear una nueva versión activa.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditingInactiveId(null)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para eliminar estructura inactiva */}
      <Dialog open={!!deletingInactiveId} onOpenChange={() => setDeletingInactiveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Estructura</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar esta estructura? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeletingInactiveId(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingInactiveId && handleEliminarEstructura(deletingInactiveId)}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para inactivar estructura activa */}
      <Dialog open={inactivarDialogOpen} onOpenChange={setInactivarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inactivar Estructura</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres inactivar esta estructura? Podrás crear una nueva estructura después.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setInactivarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleInactivarEstructura}
            >
              Inactivar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Función helper para formatear fechas de forma segura
function formatDate(date: string | Date | null | undefined, formatStr: string): string {
  if (!date) return "Sin fecha";
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) return "Fecha inválida";
    return format(dateObj, formatStr);
  } catch (error) {
    return "Fecha inválida";
  }
}

// Componentes auxiliares
function SueldoBaseCard({ estructura, periodoMes, onEdit }: { estructura: EstructuraGuardia, periodoMes: Date, onEdit: () => void }) {
  const sueldoBase = estructura.items.find(item => item.item_codigo === 'sueldo_base');
  const isActive = sueldoBase ? isItemEffectiveActive(sueldoBase, periodoMes) : false;

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Sueldo Base</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sueldoBase ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-900">
                ${Math.round(sueldoBase.monto).toLocaleString('es-CL')}
              </span>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Vigente" : "No vigente"}
              </Badge>
            </div>
            <div className="text-sm text-blue-700">
              <p>Vigente desde: {formatDate(sueldoBase.vigencia_desde, 'dd/MM/yyyy')}</p>
              {sueldoBase.vigencia_hasta && (
                <p>Vigente hasta: {formatDate(sueldoBase.vigencia_hasta, 'dd/MM/yyyy')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-blue-600">
            <p>No hay sueldo base definido</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateEstructuraForm({ guardiaId, periodoMes, onSuccess, onError }: { 
  guardiaId: string; 
  periodoMes: Date; 
  onSuccess: () => void; 
  onError: (msg: string) => void; 
}) {
  const [sueldoBase, setSueldoBase] = useState<string>('0');
  const [vigenciaDesde, setVigenciaDesde] = useState<Date>(new Date(periodoMes.getFullYear(), periodoMes.getMonth(), 1));
  const [bonosOpcionales, setBonosOpcionales] = useState<SueldoItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
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
          // Inicializar "modo rápido": listar todos los haberes y que el usuario solo ingrese montos
          setBonos(opts.map((o: SueldoItem) => ({ id: o.id, codigo: o.codigo, nombre: o.nombre, monto: '' })));
        }
      } catch (_) {}
    };
    cargarItems();
  }, []);



  const handleSueldoBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\./g, ''); // Remover puntos existentes
    const numericValue = value.replace(/[^\d]/g, ''); // Solo números
    if (numericValue) {
      const formattedValue = Number(numericValue).toLocaleString('es-CL');
      setSueldoBase(formattedValue);
    } else {
      setSueldoBase('');
    }
  };

  const handleBonoMontoChange = (id: string, value: string) => {
    const cleanValue = value.replace(/\./g, ''); // Remover puntos existentes
    const numericValue = cleanValue.replace(/[^\d]/g, ''); // Solo números
    if (numericValue) {
      const formattedValue = Number(numericValue).toLocaleString('es-CL');
      setBonos(prev => prev.map(x => x.id === id ? { ...x, monto: formattedValue } : x));
    } else {
      setBonos(prev => prev.map(x => x.id === id ? { ...x, monto: '' } : x));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardiaId || sueldoBase === '' || sueldoBase === undefined) return;
    setLoading(true);
    setErrorMessage('');
    
    try {
      // Convertir montos formateados a números
      const sueldoBaseNumerico = Number(sueldoBase.replace(/\./g, ''));
      const items = bonos
        .map(b => ({ 
          item_id: b.id, 
          monto: Number(b.monto.replace(/\./g, '') || '0') 
        }))
        .filter(x => !Number.isNaN(x.monto) && x.monto > 0);

      const payload = {
        guardia_id: guardiaId,
        vigencia_desde: format(vigenciaDesde, 'yyyy-MM-dd'),
        sueldo_base: sueldoBaseNumerico,
        items: items,
      };
      
      const res = await fetch('/api/payroll/estructuras-guardia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const json = await res.json();
      
      if (res.ok && json.success) {
        onSuccess();
      } else {
        const errorMsg = json?.message || json?.error || 'Error al crear la estructura';
        setErrorMessage(errorMsg);
        onError(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Error de conexión';
      setErrorMessage(errorMsg);
      onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* Sueldo Base */}
      <div className="space-y-2">
        <Label htmlFor="sueldo-base">Sueldo Base *</Label>
        <Input
          id="sueldo-base"
          value={sueldoBase}
          onChange={handleSueldoBaseChange}
          placeholder="0"
          required
        />
      </div>

      {/* Vigencia Desde */}
      <div className="space-y-2">
        <Label>Vigencia Desde</Label>
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
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={vigenciaDesde}
              onSelect={(date) => date && setVigenciaDesde(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Bonos Opcionales */}
      <div className="space-y-4">
        <Label>Bonos Opcionales</Label>
        <div className="space-y-2">
          {bonos.map((bono) => (
            <div key={bono.id} className="flex items-center gap-2 p-2 border rounded">
              <div className="flex-1">
                <p className="text-sm font-medium">{bono.nombre}</p>
                <p className="text-xs text-muted-foreground">{bono.codigo}</p>
              </div>
              <Input
                value={bono.monto}
                onChange={(e) => handleBonoMontoChange(bono.id, e.target.value)}
                placeholder="0"
                className="w-32"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => onError('')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Estructura'}
        </Button>
      </div>
    </form>
  );
}

function SueldoBaseForm({ estructura, onSubmit }: { estructura: EstructuraGuardia | null, onSubmit: (data: any) => void }) {
  const [monto, setMonto] = useState<number>(0);
  const [vigenciaDesde, setVigenciaDesde] = useState<string>('');

  useEffect(() => {
    if (estructura) {
      const sueldoBase = estructura.items.find(item => item.item_codigo === 'sueldo_base');
      if (sueldoBase) {
        setMonto(sueldoBase.monto);
        setVigenciaDesde(sueldoBase.vigencia_desde);
      }
    }
  }, [estructura]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="monto">Monto</Label>
        <Input
          id="monto"
          type="number"
          value={monto}
          onChange={(e) => setMonto(parseInt(e.target.value) || 0)}
          placeholder="Ingrese el monto"
        />
      </div>
      <div>
        <Label htmlFor="vigencia-desde">Vigencia Desde</Label>
        <Input
          id="vigencia-desde"
          type="date"
          value={vigenciaDesde}
          onChange={(e) => setVigenciaDesde(e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => onSubmit({})}>
          Cancelar
        </Button>
        <Button onClick={() => onSubmit({ monto, vigencia_desde: vigenciaDesde })}>
          Guardar
        </Button>
      </div>
    </div>
  );
}

function ItemForm({ items, editingItem, onSubmit }: { items: SueldoItem[], editingItem: EstructuraItem | null, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    item_id: '',
    monto: 0,
    vigencia_desde: format(new Date(), 'yyyy-MM-dd'),
    vigencia_hasta: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        item_id: editingItem.item_id,
        monto: editingItem.monto,
        vigencia_desde: editingItem.vigencia_desde,
        vigencia_hasta: editingItem.vigencia_hasta || ''
      });
    }
  }, [editingItem]);

  return (
    <div className="space-y-4">
            <div>
              <Label htmlFor="item">Ítem</Label>
        <Select value={formData.item_id} onValueChange={(value) => setFormData(prev => ({ ...prev, item_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ítem" />
                </SelectTrigger>
                <SelectContent>
            {items
              .filter(item => item.codigo !== 'sueldo_base')
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                  {item.nombre} ({item.codigo})
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
          value={formData.monto}
          onChange={(e) => setFormData(prev => ({ ...prev, monto: parseInt(e.target.value) || 0 }))}
          placeholder="Ingrese el monto"
              />
            </div>
            <div>
        <Label htmlFor="vigencia-desde">Vigencia Desde</Label>
              <Input
                id="vigencia-desde"
                type="date"
          value={formData.vigencia_desde}
          onChange={(e) => setFormData(prev => ({ ...prev, vigencia_desde: e.target.value }))}
              />
            </div>
            <div>
        <Label htmlFor="vigencia-hasta">Vigencia Hasta (opcional)</Label>
              <Input
                id="vigencia-hasta"
                type="date"
          value={formData.vigencia_hasta}
          onChange={(e) => setFormData(prev => ({ ...prev, vigencia_hasta: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => onSubmit({})}>
                Cancelar
              </Button>
        <Button onClick={() => onSubmit(formData)}>
          {editingItem ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
    </div>
  );
}
