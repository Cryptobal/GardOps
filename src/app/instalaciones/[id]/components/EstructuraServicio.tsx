'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  DollarSign,
  Shield,
  Building2,
  Edit2,
  X,
  Check
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EstructuraBono {
  id?: string;
  instalacion_id: string;
  rol_servicio_id: string;
  nombre_bono: string;
  monto: number;
  imponible: boolean;
  isNew?: boolean;
  isEditing?: boolean;
}

interface RolServicio {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface EstructuraServicioProps {
  instalacionId: string;
  rolesPrecargados?: RolServicio[];
}

export default function EstructuraServicio({ instalacionId, rolesPrecargados = [] }: EstructuraServicioProps) {
  const [roles, setRoles] = useState<RolServicio[]>(rolesPrecargados);
  const [estructuras, setEstructuras] = useState<EstructuraBono[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [editingBono, setEditingBono] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [instalacionId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Si no hay roles precargados, cargarlos
      if (rolesPrecargados.length === 0) {
        const rolesResponse = await fetch(`/api/roles-servicio/instalacion/${instalacionId}`);
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          setRoles(rolesData);
        }
      }

      // Cargar estructuras existentes
      const estructurasResponse = await fetch(`/api/instalaciones/${instalacionId}/estructuras-servicio`);
      if (estructurasResponse.ok) {
        const estructurasData = await estructurasResponse.json();
        setEstructuras(estructurasData);
        console.log("✅ Estructura de servicio cargada para la instalación");
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRolExpanded = (rolId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(rolId)) {
      newExpanded.delete(rolId);
    } else {
      newExpanded.add(rolId);
    }
    setExpandedRoles(newExpanded);
  };

  const agregarBono = (rolId: string, nombrePredefinido?: string) => {
    const nuevoBono: EstructuraBono = {
      instalacion_id: instalacionId,
      rol_servicio_id: rolId,
      nombre_bono: nombrePredefinido || '',
      monto: 0,
      imponible: nombrePredefinido === 'Sueldo Base' ? true : true,
      isNew: true,
      isEditing: true
    };
    
    setEstructuras([...estructuras, nuevoBono]);
    setExpandedRoles(new Set([...expandedRoles, rolId]));
  };
  
  const inicializarSueldoBase = async (rolId: string) => {
    // Verificar si ya existe un sueldo base
    const tieneSueldoBase = estructuras.some(e => 
      e.rol_servicio_id === rolId && e.nombre_bono === 'Sueldo Base'
    );
    
    if (!tieneSueldoBase) {
      // Agregar sueldo base automáticamente
      agregarBono(rolId, 'Sueldo Base');
    }
  };

  const editarBono = (bonoId: string) => {
    setEditingBono(bonoId);
    setEstructuras(estructuras.map(e => 
      e.id === bonoId ? { ...e, isEditing: true } : e
    ));
  };

  const cancelarEdicion = (bono: EstructuraBono) => {
    if (bono.isNew) {
      // Si es nuevo y se cancela, eliminarlo
      setEstructuras(estructuras.filter(e => e !== bono));
    } else {
      // Si es existente, cancelar la edición
      setEstructuras(estructuras.map(e => 
        e.id === bono.id ? { ...e, isEditing: false } : e
      ));
    }
    setEditingBono(null);
  };

  const actualizarBono = (index: number, campo: keyof EstructuraBono, valor: any) => {
    const nuevasEstructuras = [...estructuras];
    nuevasEstructuras[index] = {
      ...nuevasEstructuras[index],
      [campo]: valor
    };
    setEstructuras(nuevasEstructuras);
  };

  const guardarBono = async (bono: EstructuraBono, index: number) => {
    // Validar datos
    if (!bono.nombre_bono || bono.monto <= 0) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    try {
      setSaving(true);
      
      if (bono.isNew) {
        // Crear nuevo bono
        const response = await fetch(`/api/instalaciones/${instalacionId}/estructuras-servicio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rol_servicio_id: bono.rol_servicio_id,
            nombre_bono: bono.nombre_bono,
            monto: bono.monto,
            imponible: bono.imponible
          })
        });

        if (response.ok) {
          const nuevoBono = await response.json();
          const nuevasEstructuras = [...estructuras];
          nuevasEstructuras[index] = { ...nuevoBono, isEditing: false, isNew: false };
          setEstructuras(nuevasEstructuras);
        } else {
          throw new Error('Error al crear bono');
        }
      } else {
        // Actualizar bono existente
        const response = await fetch(`/api/instalaciones/${instalacionId}/estructuras-servicio/${bono.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre_bono: bono.nombre_bono,
            monto: bono.monto,
            imponible: bono.imponible
          })
        });

        if (response.ok) {
          const bonoActualizado = await response.json();
          const nuevasEstructuras = [...estructuras];
          nuevasEstructuras[index] = { ...bonoActualizado, isEditing: false };
          setEstructuras(nuevasEstructuras);
        } else {
          throw new Error('Error al actualizar bono');
        }
      }
      
      setEditingBono(null);
      console.log(`✅ Bono ${bono.isNew ? 'creado' : 'actualizado'} correctamente`);
    } catch (error) {
      console.error('Error guardando bono:', error);
      alert('Error al guardar el bono');
    } finally {
      setSaving(false);
    }
  };

  const eliminarBono = async (bonoId: string) => {
    // No permitir eliminar sueldo base
    const bono = estructuras.find(e => e.id === bonoId);
    if (bono && bono.nombre_bono === 'Sueldo Base') {
      alert('El Sueldo Base no puede ser eliminado');
      return;
    }
    
    if (!confirm('¿Estás seguro de eliminar este bono?')) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/instalaciones/${instalacionId}/estructuras-servicio/${bonoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEstructuras(estructuras.filter(e => e.id !== bonoId));
        console.log('✅ Bono eliminado correctamente');
      } else {
        throw new Error('Error al eliminar bono');
      }
    } catch (error) {
      console.error('Error eliminando bono:', error);
      alert('Error al eliminar el bono');
    } finally {
      setSaving(false);
    }
  };

  const obtenerEstructurasRol = (rolId: string) => {
    const estructurasRol = estructuras.filter(e => e.rol_servicio_id === rolId);
    // Ordenar para que Sueldo Base aparezca primero
    return estructurasRol.sort((a, b) => {
      if (a.nombre_bono === 'Sueldo Base') return -1;
      if (b.nombre_bono === 'Sueldo Base') return 1;
      return a.nombre_bono.localeCompare(b.nombre_bono);
    });
  };
  
  const obtenerSueldoBase = (rolId: string) => {
    return estructuras.find(e => 
      e.rol_servicio_id === rolId && e.nombre_bono === 'Sueldo Base'
    );
  };

  const calcularTotalRol = (rolId: string) => {
    return obtenerEstructurasRol(rolId).reduce((sum, e) => sum + e.monto, 0);
  };

  const calcularImponibleRol = (rolId: string) => {
    return obtenerEstructurasRol(rolId)
      .filter(e => e.imponible)
      .reduce((sum, e) => sum + e.monto, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando estructura de servicio...</span>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          ⚠️ Esta instalación no tiene roles de servicio definidos aún.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Estructura de Servicio por Rol</h2>
        </div>
        <Badge variant="outline" className="ml-auto">
          {roles.length} {roles.length === 1 ? 'Rol' : 'Roles'}
        </Badge>
      </div>

      {/* Roles y sus estructuras */}
      <div className="space-y-4">
        {roles.map((rol) => {
          const estructurasRol = obtenerEstructurasRol(rol.id);
          const sueldoBase = obtenerSueldoBase(rol.id);
          const totalRol = calcularTotalRol(rol.id);
          const imponibleRol = calcularImponibleRol(rol.id);
          const isExpanded = expandedRoles.has(rol.id);

          return (
            <Card key={rol.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleRolExpanded(rol.id)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <Shield className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">{rol.nombre}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        ({isExpanded ? '−' : '+'})
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Sueldo Base</p>
                      <p className="text-base font-semibold text-primary">
                        ${sueldoBase ? sueldoBase.monto.toLocaleString('es-CL') : '0'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">
                        ${totalRol.toLocaleString('es-CL')}
                      </p>
                    </div>
                    {!sueldoBase ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => agregarBono(rol.id, 'Sueldo Base')}
                        disabled={saving}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Definir Sueldo Base
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => agregarBono(rol.id)}
                        disabled={saving}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar Bono
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  {estructurasRol.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[40%]">Concepto</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-center">Imponible</TableHead>
                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {estructurasRol.map((bono, index) => {
                            const bonoIndex = estructuras.findIndex(e => e === bono);
                            
                            const esSueldoBase = bono.nombre_bono === 'Sueldo Base';
                            
                            return (
                              <TableRow key={bono.id || `new-${index}`} className={esSueldoBase ? 'bg-primary/5' : ''}>
                                <TableCell>
                                  {bono.isEditing ? (
                                    <Input
                                      value={bono.nombre_bono}
                                      onChange={(e) => actualizarBono(bonoIndex, 'nombre_bono', e.target.value)}
                                      placeholder="Ej: Movilización, Colación..."
                                      className="h-8"
                                      autoFocus
                                      disabled={esSueldoBase} // No permitir cambiar el nombre del sueldo base
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {esSueldoBase ? (
                                        <>
                                          <Badge variant="default" className="h-5">
                                            <DollarSign className="h-3 w-3 mr-1" />
                                            BASE
                                          </Badge>
                                          <span className="font-semibold">{bono.nombre_bono}</span>
                                        </>
                                      ) : (
                                        <>
                                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">{bono.nombre_bono}</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {bono.isEditing ? (
                                    <Input
                                      type="number"
                                      value={bono.monto}
                                      onChange={(e) => actualizarBono(bonoIndex, 'monto', parseInt(e.target.value) || 0)}
                                      className="h-8 text-right"
                                      min="0"
                                    />
                                  ) : (
                                    <span className="font-mono">
                                      ${bono.monto.toLocaleString('es-CL')}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {bono.isEditing ? (
                                    <Switch
                                      checked={bono.imponible}
                                      onCheckedChange={(checked) => actualizarBono(bonoIndex, 'imponible', checked)}
                                    />
                                  ) : (
                                    <Badge 
                                      variant={bono.imponible ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {bono.imponible ? 'Sí' : 'No'}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {bono.isEditing ? (
                                    <div className="flex items-center gap-1 justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => guardarBono(bono, bonoIndex)}
                                        disabled={saving}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => cancelarEdicion(bono)}
                                        disabled={saving}
                                        className="h-7 w-7 p-0"
                                      >
                                        <X className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => editarBono(bono.id!)}
                                        disabled={saving}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      {!esSueldoBase && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => eliminarBono(bono.id!)}
                                          disabled={saving}
                                          className="h-7 w-7 p-0"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          
                          {/* Fila de totales */}
                          <TableRow className="bg-muted/30 font-medium">
                            <TableCell>Totales</TableCell>
                            <TableCell className="text-right">
                              ${totalRol.toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm text-muted-foreground">
                                Imponible: ${imponibleRol.toLocaleString('es-CL')}
                              </span>
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm mb-2">No hay estructura de sueldo configurada para este rol</p>
                      <p className="text-xs mb-4">Comienza definiendo el sueldo base</p>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => agregarBono(rol.id, 'Sueldo Base')}
                        className="mt-3"
                        disabled={saving}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Definir Sueldo Base
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
