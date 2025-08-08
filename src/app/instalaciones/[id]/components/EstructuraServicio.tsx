'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
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
  Settings
} from 'lucide-react';

interface EstructuraBono {
  id?: string;
  instalacion_id: string;
  rol_servicio_id: string;
  nombre_bono: string;
  monto: number;
  imponible: boolean;
  isNew?: boolean;
  isEditing?: boolean;
  created_at?: string;
  updated_at?: string;
  fecha_inactivacion?: string | null;
}

interface RolServicio {
  id: string;
  nombre: string;
  descripcion?: string;
  dias_trabajo?: number;
  dias_descanso?: number;
  horas_turno?: number;
  hora_inicio?: string;
  hora_termino?: string;
  estado?: 'Activo' | 'Inactivo';
  tenant_id?: string | null;
  created_at?: string;
  updated_at?: string;
  fecha_inactivacion?: string | null;
}

interface EstructuraServicioProps {
  instalacionId: string;
  rolesPrecargados?: RolServicio[];
}

export default function EstructuraServicio({ instalacionId, rolesPrecargados = [] }: EstructuraServicioProps) {
  const { success: notifySuccess, error: notifyError } = useToast();

  const [roles, setRoles] = useState<RolServicio[]>(rolesPrecargados);
  const [estructuras, setEstructuras] = useState<EstructuraBono[]>([]);
  const [estructurasInactivas, setEstructurasInactivas] = useState<EstructuraBono[]>([]);
  const [bonosGlobales, setBonosGlobales] = useState<{ id: string; nombre: string; imponible: boolean; activo: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);
  const [editingBono, setEditingBono] = useState<string | null>(null);
  const [liquidoPorRol, setLiquidoPorRol] = useState<Record<string, number>>({});
  const recalculoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fetchControllers = useRef<Record<string, AbortController | null>>({});

  useEffect(() => {
    cargarDatos();
  }, [instalacionId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar roles si no hay precargados
      if (rolesPrecargados.length === 0) {
        const rolesResponse = await fetch(`/api/roles-servicio/instalacion/${instalacionId}`);
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          const rolesArray = Array.isArray(rolesData) 
            ? rolesData 
            : (rolesData.rows || []);
          setRoles(rolesArray);
        }
      }

      // Cargar estructuras activas
      const estructurasResponse = await fetch(`/api/instalaciones/${instalacionId}/estructuras-servicio`);
      let estructurasArray: any[] = [];
      if (estructurasResponse.ok) {
        const estructurasData = await estructurasResponse.json();
        estructurasArray = Array.isArray(estructurasData)
          ? estructurasData 
          : (estructurasData.rows || []);
        setEstructuras(estructurasArray);
      }

      // Cargar estructuras inactivas
      const estructurasInactivasResponse = await fetch(`/api/instalaciones/${instalacionId}/estructuras-servicio?activo=false`);
      let estructurasInactivasArray: any[] = [];
      if (estructurasInactivasResponse.ok) {
        const estructurasInactivasData = await estructurasInactivasResponse.json();
        estructurasInactivasArray = Array.isArray(estructurasInactivasData)
          ? estructurasInactivasData 
          : (estructurasInactivasData.rows || []);
        setEstructurasInactivas(estructurasInactivasArray);
      }

      // Unificar roles
      const rolesMapFinal: Record<string, RolServicio> = {};
      const touch = (e: any, estado: 'Activo'|'Inactivo') => {
        const id = e.rol_servicio_id;
        const existing = rolesMapFinal[id] || {} as RolServicio;
        const estadoFinal: 'Activo'|'Inactivo' = existing.estado === 'Activo' ? 'Activo' : estado;
        rolesMapFinal[id] = {
          id,
          nombre: e.rol_nombre || existing.nombre || 'Rol sin nombre',
          estado: estadoFinal,
          dias_trabajo: existing.dias_trabajo || 0,
          dias_descanso: existing.dias_descanso || 0,
          horas_turno: existing.horas_turno || 0,
          hora_inicio: existing.hora_inicio || '00:00',
          hora_termino: existing.hora_termino || '00:00',
          tenant_id: null,
          created_at: (e.created_at || existing.created_at || new Date().toISOString()),
          updated_at: (e.updated_at || existing.updated_at || new Date().toISOString()),
          fecha_inactivacion: (e.fecha_inactivacion || existing.fecha_inactivacion || null),
        };
      };
      for (const e of estructurasArray) touch(e, 'Activo');
      for (const e of estructurasInactivasArray) touch(e, 'Inactivo');
      setRoles(Object.values(rolesMapFinal));

      // Cargar bonos globales
      const bonosResponse = await fetch('/api/bonos-globales?activo=true');
      if (bonosResponse.ok) {
        const bonosData = await bonosResponse.json();
        const rows = Array.isArray(bonosData.data) ? bonosData.data : (bonosData.rows || bonosData);
        setBonosGlobales(rows || []);
      } else {
        setBonosGlobales([]);
      }

      // Expandir todos los roles automáticamente
      const allRoleIds = Object.values(rolesMapFinal).map(r => r.id);
      setExpandedRoles(allRoleIds);

      // Recalcular líquidos
      for (const rid of allRoleIds) {
        programarRecalculo(rid, 0);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRolExpanded = (rolId: string) => {
    if (expandedRoles.includes(rolId)) {
      setExpandedRoles(expandedRoles.filter(id => id !== rolId));
    } else {
      setExpandedRoles([...expandedRoles, rolId]);
    }
  };

  const agregarBono = (rolId: string, nombrePredefinido?: string) => {
    if (nombrePredefinido === 'Sueldo Base') {
      const yaExisteBase = estructuras.some(e => e.rol_servicio_id === rolId && e.nombre_bono === 'Sueldo Base');
      if (yaExisteBase) return;
    }
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
    if (!expandedRoles.includes(rolId)) {
      setExpandedRoles([...expandedRoles, rolId]);
    }
    programarRecalculo(rolId);
  };

  const editarBono = (bonoId: string) => {
    setEditingBono(bonoId);
    setEstructuras(estructuras.map(e => 
      e.id === bonoId ? { ...e, isEditing: true } : e
    ));
  };

  const cancelarEdicion = (bono: EstructuraBono) => {
    if (bono.isNew) {
      setEstructuras(estructuras.filter(e => e !== bono));
    } else {
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
    const rid = nuevasEstructuras[index].rol_servicio_id;
    programarRecalculo(rid, 300, obtenerEstructurasRolConArray(rid, nuevasEstructuras));
  };

  const guardarBono = async (bono: EstructuraBono, index: number) => {
    if (!bono.nombre_bono || bono.monto <= 0) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    try {
      setSaving(true);
      
      if (bono.isNew) {
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
          programarRecalculo(nuevasEstructuras[index].rol_servicio_id);
        } else {
          throw new Error('Error al crear bono');
        }
      } else {
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
          programarRecalculo(nuevasEstructuras[index].rol_servicio_id);
        } else {
          throw new Error('Error al actualizar bono');
        }
      }
      
      setEditingBono(null);
    } catch (error) {
      console.error('Error guardando bono:', error);
      alert('Error al guardar el bono');
    } finally {
      setSaving(false);
    }
  };

  const eliminarBono = async (bonoId: string) => {
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
        const rolId = bono?.rol_servicio_id as string;
        programarRecalculo(rolId);
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

  const normalizarNombre = (nombre: string): string => {
    const sinAcentos = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return sinAcentos.trim();
  }

  const programarRecalculo = (rolId: string, delay: number = 500, itemsOverride?: EstructuraBono[]) => {
    const timer = recalculoTimers.current[rolId];
    if (timer) clearTimeout(timer);
    recalculoTimers.current[rolId] = setTimeout(() => {
      recalcularLiquido(rolId, itemsOverride);
    }, delay);
  }

  const recalcularLiquido = async (rolId: string, itemsOverride?: EstructuraBono[]) => {
    try {
      const items = itemsOverride || obtenerEstructurasRol(rolId);
      const base = items.find(i => i.nombre_bono === 'Sueldo Base')?.monto || 0;

      const imponibles = items.filter(i => i.nombre_bono !== 'Sueldo Base' && i.imponible);
      const noImponibles = items.filter(i => i.nombre_bono !== 'Sueldo Base' && !i.imponible);

      if (!Number.isFinite(base) || base <= 0) {
        setLiquidoPorRol(prev => ({ ...prev, [rolId]: 0 }));
        return;
      }

      const bonos: any = { nocturnidad: 0, festivo: 0, peligrosidad: 0, responsabilidad: 0, otros: 0 };
      const noImp: any = { colacion: 0, movilizacion: 0, viatico: 0, desgaste: 0, asignacionFamiliar: 0 };

      for (const b of imponibles) {
        const n = normalizarNombre(b.nombre_bono);
        if (n.includes('nocturn')) bonos.nocturnidad += b.monto;
        else if (n.includes('festiv') || n.includes('feriad')) bonos.festivo += b.monto;
        else if (n.includes('pelig') || n.includes('riesgo')) bonos.peligrosidad += b.monto;
        else if (n.includes('respons')) bonos.responsabilidad += b.monto;
        else bonos.otros += b.monto;
      }

      for (const b of noImponibles) {
        const n = normalizarNombre(b.nombre_bono);
        if (n.includes('colac')) noImp.colacion += b.monto;
        else if (n.includes('movil')) noImp.movilizacion += b.monto;
        else if (n.includes('viati')) noImp.viatico += b.monto;
        else noImp.desgaste += b.monto;
      }

      const payload = {
        sueldoBase: base,
        fecha: new Date(),
        afp: 'modelo',
        tipoSalud: 'fonasa' as const,
        horasExtras: { cincuenta: 0, cien: 0 },
        bonos,
        comisiones: 0,
        noImponible: noImp,
        descuentosVoluntarios: 0,
        anticipos: 0,
        judiciales: 0,
        apv: 0,
        cuenta2: 0,
        cotizacionAdicionalUF: 0,
        diasAusencia: 0,
        tipoContrato: 'indefinido' as const,
      };

      if (fetchControllers.current[rolId]) {
        try { fetchControllers.current[rolId]?.abort(); } catch {}
      }
      const controller = new AbortController();
      fetchControllers.current[rolId] = controller;

      const res = await fetch('/api/sueldos/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) return;
      
      const data = await res.json();
      const liquido = data?.data?.sueldoLiquido || 0;
      setLiquidoPorRol(prev => ({ ...prev, [rolId]: liquido }));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }

  const obtenerEstructurasRol = (rolId: string) => {
    const estructurasRol = estructuras.filter(e => e.rol_servicio_id === rolId);
    return estructurasRol.sort((a, b) => {
      if (a.nombre_bono === 'Sueldo Base') return -1;
      if (b.nombre_bono === 'Sueldo Base') return 1;
      return a.nombre_bono.localeCompare(b.nombre_bono);
    });
  };
  
  const obtenerEstructurasRolConArray = (rolId: string, arr: EstructuraBono[]) => {
    const estructurasRol = arr.filter(e => e.rol_servicio_id === rolId);
    return estructurasRol.sort((a, b) => {
      if (a.nombre_bono === 'Sueldo Base') return -1;
      if (b.nombre_bono === 'Sueldo Base') return 1;
      return a.nombre_bono.localeCompare(b.nombre_bono);
    });
  };

  const obtenerEstructurasInactivasRol = (rolId: string) => {
    const estructurasRol = estructurasInactivas.filter(e => e.rol_servicio_id === rolId);
    return estructurasRol.sort((a, b) => {
      if (a.nombre_bono === 'Sueldo Base') return -1;
      if (b.nombre_bono === 'Sueldo Base') return 1;
      return a.nombre_bono.localeCompare(b.nombre_bono);
    });
  };

  const activarEstructuraInactiva = async (estructuraId: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/estructuras-servicio/${estructuraId}/activar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        notifySuccess("Estructura activada exitosamente", "La estructura ha sido reactivada");
        await cargarDatos();
      } else {
        const error = await response.json();
        notifyError("Error al activar la estructura", error.error || 'No se pudo completar la operación');
      }
    } catch (error) {
      console.error('Error activando estructura:', error);
      notifyError("Error al activar la estructura", error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };
  
  const inactivarEstructura = async (rolId: string) => {
    const baseActiva = obtenerEstructurasRol(rolId).find(e => e.nombre_bono === 'Sueldo Base');
    if (!baseActiva?.id) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/estructuras-servicio/${baseActiva.id}/inactivar`, {
        method: 'PUT'
      });

      if (response.ok) {
        notifySuccess("Estructura inactivada", "La estructura ha sido inactivada correctamente");
        await cargarDatos();
      } else {
        const error = await response.json();
        notifyError("Error al inactivar", error.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error:', error);
      notifyError("Error al inactivar", "No se pudo inactivar la estructura");
    } finally {
      setSaving(false);
    }
  };

  const crearNuevaEstructura = async (rolId: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/instalaciones/${instalacionId}/estructuras-servicio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rol_servicio_id: rolId,
          nombre_bono: 'Sueldo Base',
          monto: 0,
          imponible: true,
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'No se pudo crear la nueva estructura');
      }

      notifySuccess('Nueva estructura creada', 'Se creó una estructura activa con Sueldo Base');
      await cargarDatos();
    } catch (e) {
      console.error('Error creando nueva estructura:', e);
      notifyError('Error', e instanceof Error ? e.message : 'No se pudo crear la nueva estructura');
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Estructura de Servicio por Rol</h2>
        </div>
        <Badge variant="outline" className="ml-auto">
          {roles.length} {roles.length === 1 ? 'Rol' : 'Roles'}
        </Badge>
      </div>

      <div className="space-y-4">
        {roles.map((rol) => {
          const estructurasRol = obtenerEstructurasRol(rol.id);
          const estructurasInactivasRol = obtenerEstructurasInactivasRol(rol.id);
          const sueldoBase = obtenerSueldoBase(rol.id);
          const totalRol = calcularTotalRol(rol.id);
          const imponibleRol = calcularImponibleRol(rol.id);
          const isExpanded = expandedRoles.includes(rol.id);
          const tieneEstructuraActiva = estructurasRol.length > 0;

          return (
            <Card key={rol.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleRolExpanded(rol.id)}
                      className="flex items-start gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                      >
                      <Shield className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                      <CardTitle className="text-base">{rol.nombre}</CardTitle>
                        <div className="text-xs text-muted-foreground">
                          Creado: {new Date(rol.created_at || new Date().toISOString()).toLocaleDateString('es-CL')}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground ml-1 mt-0.5">
                        ({isExpanded ? '−' : '+'})
                      </span>
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      {tieneEstructuraActiva ? (
                      <Badge 
                          variant="outline"
                          className="text-xs border-emerald-500 text-emerald-600 bg-emerald-500/10"
                      >
                          <Eye className="h-3 w-3 mr-1 text-emerald-600" />
                          Estructura activa
                      </Badge>
                      ) : (
                        <Badge 
                          variant="outline"
                          className="text-xs border-red-500 text-red-600 bg-red-500/10"
                        >
                          <EyeOff className="h-3 w-3 mr-1 text-red-600" />
                          Sin estructura activa
                        </Badge>
                      )}
                    </div>
                    
                    {tieneEstructuraActiva && (
                    <div className="text-right ml-auto">
                      <p className="text-sm text-muted-foreground" title="Fonasa + AFP Modelo">Líquido Estimado</p>
                      <p className="text-lg font-bold text-emerald-600 tabular-nums">
                          ${(Math.round(liquidoPorRol[rol.id] || 0)).toLocaleString('es-CL')}
                      </p>
                    </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Estructura activa */}
                    {tieneEstructuraActiva && (
                      <>
                        <div className="rounded-lg border overflow-hidden">
                          <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium">Estructura activa</h4>
                              <p className="text-xs text-muted-foreground">
                                Creada: {estructurasRol[0]?.created_at ? new Date(estructurasRol[0].created_at).toLocaleDateString('es-CL') : '—'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => inactivarEstructura(rol.id)}
                                disabled={saving}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <PowerOff className="h-3 w-3 mr-1" />
                                Inactivar
                              </Button>
                    </div>
                          </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                  <TableHead className="w-[50%]">Concepto</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
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
                                        esSueldoBase ? (
                                          <Input value={bono.nombre_bono} disabled className="h-8" />
                                                                                    ) : bonosGlobales.length > 0 ? (
                                            <>
                                              <Input
                                                type="text"
                                                list={`bonos-list-${bonoIndex}`}
                                                value={bono.nombre_bono || ''}
                                                onChange={(e) => {
                                                  const value = e.target.value;
                                                  actualizarBono(bonoIndex, 'nombre_bono', value);
                                                  const selected = bonosGlobales.find(bg => bg.nombre === value);
                                                  if (selected) {
                                                    actualizarBono(bonoIndex, 'imponible', selected.imponible);
                                                  }
                                                }}
                                                placeholder="Seleccione o escriba un bono"
                                                className="h-8"
                                                autoFocus
                                              />
                                              <datalist id={`bonos-list-${bonoIndex}`}>
                                                {bonosGlobales.map((bg) => (
                                                  <option key={bg.id} value={bg.nombre}>
                                                    {bg.imponible ? '(Imponible)' : '(No Imponible)'}
                                                  </option>
                                                ))}
                                              </datalist>
                                            </>
                                            ) : (
                                              <Input
                                                type="text"
                                                value={bono.nombre_bono || ''}
                                                onChange={(e) => actualizarBono(bonoIndex, 'nombre_bono', e.target.value)}
                                                placeholder="Nombre del bono"
                                                className="h-8"
                                                autoFocus
                                              />
                                    )
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {esSueldoBase ? (
                                          <span className="font-semibold">{bono.nombre_bono}</span>
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
                                      onBlur={() => programarRecalculo(bono.rol_servicio_id, 0)}
                                      className="h-8 text-right"
                                      min="0"
                                    />
                                  ) : (
                                    <span className="font-mono">
                                      ${bono.monto.toLocaleString('es-CL')}
                                    </span>
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
                          
                          <TableRow className="bg-muted/30 font-medium">
                                  <TableCell>Total</TableCell>
                            <TableCell className="text-right">
                              ${totalRol.toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                          </Table>
                        </div>
                      </div>
                      </>
                    )}

                    {/* Estructuras inactivas */}
                    {estructurasInactivasRol.length > 0 && (
                      <div className="rounded-lg border overflow-hidden">
                        <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Estructuras inactivas ({estructurasInactivasRol.length})
                            </h4>
          </div>
                          {!tieneEstructuraActiva && (
                        <Button
                          size="sm"
                              variant="default"
                              onClick={() => crearNuevaEstructura(rol.id)}
                          disabled={saving}
                        >
                              <Plus className="h-3 w-3 mr-1" />
                              Crear nueva estructura
                        </Button>
                          )}
                          </div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/20">
                                  <TableHead className="w-[40%]">Concepto</TableHead>
                                <TableHead className="text-center">Creada</TableHead>
                                <TableHead className="text-center">Cerrada</TableHead>
                                  <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {estructurasInactivasRol.map((bono) => {
                                  const esSueldoBase = bono.nombre_bono === 'Sueldo Base';
                                  return (
                                    <TableRow key={bono.id} className={esSueldoBase ? 'bg-primary/5' : ''}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {esSueldoBase ? (
                                              <span className="font-semibold">{bono.nombre_bono}</span>
                                          ) : (
                                            <>
                                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                                              <span className="font-medium">{bono.nombre_bono}</span>
                                            </>
                                          )}
                                        </div>
                                      </TableCell>
                                    <TableCell className="text-center text-xs text-muted-foreground">
                                      {bono.created_at ? new Date(bono.created_at).toLocaleDateString('es-CL') : '—'}
                                      </TableCell>
                                    <TableCell className="text-center text-xs text-muted-foreground">
                                      {bono.fecha_inactivacion ? new Date(bono.fecha_inactivacion).toLocaleDateString('es-CL') : '—'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                      <span className="font-mono">${bono.monto.toLocaleString('es-CL')}</span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                    )}

                    {/* Mensaje cuando no hay nada */}
                    {!tieneEstructuraActiva && estructurasInactivasRol.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-2">No hay estructura de sueldo configurada para este rol</p>
                        <p className="text-xs mb-4">Comienza creando una nueva estructura</p>
                        <Button
                          variant="default"
                          onClick={() => crearNuevaEstructura(rol.id)}
                          disabled={saving}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Crear nueva estructura
                        </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
    </div>
  );
}