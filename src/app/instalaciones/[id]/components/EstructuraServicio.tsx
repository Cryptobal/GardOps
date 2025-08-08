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
// Inactivar/activar estructura deshabilitado temporalmente

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
  const [expandedRolesInactivos, setExpandedRolesInactivos] = useState<string[]>([]);
  const [editingBono, setEditingBono] = useState<string | null>(null);
  const [liquidoPorRol, setLiquidoPorRol] = useState<Record<string, number>>({});
  const recalculoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fetchControllers = useRef<Record<string, AbortController | null>>({});
  const [confirmInactivarRolId, setConfirmInactivarRolId] = useState<string | null>(null);

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
          // Extraer el array de rows si viene con metadata, o usar directamente si es array
          const rolesArray = Array.isArray(rolesData) 
            ? rolesData 
            : (rolesData.rows || []);
          setRoles(rolesArray);
        }
      }

      // Cargar estructuras existentes (activas)
      const estructurasResponse = await fetch(`/api/instalaciones/${instalacionId}/estructuras-servicio`);
      let estructurasArray: any[] = [];
      if (estructurasResponse.ok) {
        const estructurasData = await estructurasResponse.json();
        estructurasArray = Array.isArray(estructurasData)
          ? estructurasData
          : (estructurasData.rows || []);
        setEstructuras(estructurasArray);
        console.log("✅ Estructura de servicio cargada para la instalación");
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
        console.log("✅ Estructuras inactivas cargadas:", estructurasInactivasArray.length);
      }

      // Unificar roles según respuesta del servidor (sin depender del estado previo)
      {
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
      }

      // Cargar bonos globales activos desde el mantenedor
      const bonosResponse = await fetch('/api/bonos-globales?activo=true');
      if (bonosResponse.ok) {
        const bonosData = await bonosResponse.json();
        const rows = Array.isArray(bonosData.data) ? bonosData.data : (bonosData.rows || bonosData);
        setBonosGlobales(rows);
      }

      // Recalcular líquidos estimados por cada rol cargado (si tiene base)
      const rolesIds = Array.from(new Set((Array.isArray(roles) ? roles : []).map(r => r.id)));
      for (const rid of rolesIds) {
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
    // Evitar duplicar sueldo base
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
    // Recalcular líquido con debounce
    programarRecalculo(rolId);
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
    // Recalcular líquido del rol afectado con debounce usando snapshot coherente
    const rid = nuevasEstructuras[index].rol_servicio_id;
    programarRecalculo(rid, 300, obtenerEstructurasRolConArray(rid, nuevasEstructuras));
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
          programarRecalculo(nuevasEstructuras[index].rol_servicio_id);
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
          programarRecalculo(nuevasEstructuras[index].rol_servicio_id);
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

  // --- Cálculo de sueldo líquido en tiempo real ---
  function normalizarNombre(nombre: string): string {
    // Remover acentos de forma compatible sin usar \p{Diacritic}
    const sinAcentos = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return sinAcentos.trim();
  }

  function programarRecalculo(rolId: string, delay: number = 500, itemsOverride?: EstructuraBono[]) {
    const timer = recalculoTimers.current[rolId];
    if (timer) clearTimeout(timer);
    recalculoTimers.current[rolId] = setTimeout(() => {
      recalcularLiquido(rolId, itemsOverride);
    }, delay);
  }

  async function recalcularLiquido(rolId: string, itemsOverride?: EstructuraBono[]) {
    try {
      const items = itemsOverride || obtenerEstructurasRol(rolId);
      const base = items.find(i => i.nombre_bono === 'Sueldo Base')?.monto || 0;

      const imponibles = items.filter(i => i.nombre_bono !== 'Sueldo Base' && i.imponible);
      const noImponibles = items.filter(i => i.nombre_bono !== 'Sueldo Base' && !i.imponible);

      // Evitar llamadas innecesarias mientras el usuario escribe o sin datos
      if (!Number.isFinite(base) || base <= 0) {
        setLiquidoPorRol(prev => ({ ...prev, [rolId]: 0 }));
        return;
      }

      // Mapear a SueldoInput
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
        else noImp.desgaste += b.monto; // genérico
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

      // Cancelar request anterior si existe
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
      if (!res.ok) {
        // 400 u otros: no romper UI ni pisar valores correctos previos
        return;
      }
      const data = await res.json();
      const liquido = data?.data?.sueldoLiquido || 0;
      setLiquidoPorRol(prev => ({ ...prev, [rolId]: liquido }));
    } catch (e) {
      // Ignorar abortos de control
      if (e instanceof DOMException && e.name === 'AbortError') return;
      // Silencioso para no entorpecer UX
    }
  }

  const obtenerEstructurasRol = (rolId: string) => {
    const estructurasRol = estructuras.filter(e => e.rol_servicio_id === rolId);
    // Ordenar para que Sueldo Base aparezca primero
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

  const toggleRolInactivoExpanded = (rolId: string) => {
    if (expandedRolesInactivos.includes(rolId)) {
      setExpandedRolesInactivos(expandedRolesInactivos.filter(id => id !== rolId));
    } else {
      setExpandedRolesInactivos([...expandedRolesInactivos, rolId]);
    }
  };

  const activarEstructuraInactiva = async (estructuraId: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/estructuras-servicio/${estructuraId}/activar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: 'Activación desde instalación' })
      });

      if (response.ok) {
        notifySuccess("Estructura activada exitosamente", "La estructura ha sido reactivada");
        await cargarDatos();
      } else {
        const error = await response.json();
        notifyError("Error al activar la estructura", error.error || 'No se pudo completar la operación');
        throw new Error(error.error || 'Error al activar la estructura');
      }
    } catch (error) {
      console.error('Error activando estructura:', error);
      notifyError("Error al activar la estructura", error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  // Nueva función para activar todas las estructuras de un rol
  const activarTodasEstructurasRol = async (rolId: string) => {
    const estructurasRol = obtenerEstructurasInactivasRol(rolId);
    if (estructurasRol.length === 0) {
      notifyError("No hay estructuras para activar", "Este rol no tiene estructuras inactivas");
      return;
    }

    if (!confirm(`¿Estás seguro de activar todas las estructuras del rol "${roles.find(r => r.id === rolId)?.nombre}"?\n\nSe activarán ${estructurasRol.length} estructuras.`)) {
      return;
    }

    try {
      setSaving(true);
      let activadas = 0;
      let errores = 0;

      for (const estructura of estructurasRol) {
        try {
          const response = await fetch(`/api/estructuras-servicio/${estructura.id}/activar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo: 'Activación masiva desde instalación' })
          });

          if (response.ok) {
            activadas++;
          } else {
            errores++;
          }
        } catch (error) {
          errores++;
        }
      }

      if (activadas > 0) {
        notifySuccess(
          "Estructuras activadas", 
          `Se activaron ${activadas} estructuras${errores > 0 ? ` (${errores} errores)` : ''}`
        );
        await cargarDatos();
      } else {
        notifyError("Error al activar estructuras", "No se pudo activar ninguna estructura");
      }
    } catch (error) {
      console.error('Error activando estructuras:', error);
      notifyError("Error al activar estructuras", error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  // Crear una nueva estructura activa (manteniendo las inactivas existentes)
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

      const nueva = await res.json();

      // Optimista: marcar rol activo y mostrar nueva estructura en la sección de activos
      setRoles(prev => prev.map(r => r.id === rolId ? { ...r, estado: 'Activo' } : r));
      setEstructuras(prev => [
        ...prev,
        {
          id: nueva.id,
          instalacion_id: instalacionId,
          rol_servicio_id: rolId,
          nombre_bono: 'Sueldo Base',
          monto: 0,
          imponible: true,
          created_at: nueva.created_at || new Date().toISOString(),
          updated_at: nueva.updated_at || new Date().toISOString(),
          fecha_inactivacion: null,
        },
      ]);
      setExpandedRoles(prev => prev.includes(rolId) ? prev : [...prev, rolId]);
      setExpandedRolesInactivos(prev => prev.filter(id => id !== rolId));
      programarRecalculo(rolId, 0);

      notifySuccess('Nueva estructura creada', 'Se creó una estructura activa con Sueldo Base');

      // Recarga suave para sincronizar datos (mantiene las inactivas)
      cargarDatos();
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

  // Nueva función para inactivar rol de servicio completamente
  const inactivarRolCompleto = async (rolId: string) => {
    try {
      setSaving(true);
        const response = await fetch(`/api/roles-servicio/inactivar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rolId, instalacionId, motivo: 'Inactivación desde instalación', usuario_id: null })
      });

      if (response.ok) {
        const resultado = await response.json();
        notifySuccess(
          "Rol inactivado exitosamente",
          `Se han liberado ${resultado.guardias_liberados} guardias y la estructura ha sido ${resultado.estructura_inactivada ? 'inactivada' : 'preservada'}.`
        );
        // Optimista: marcar inactivo y mover a lista inactivos
        setRoles(prev => prev.map(r => r.id === rolId ? { ...r, estado: 'Inactivo' } : r));
        setExpandedRoles(prev => prev.filter(id => id !== rolId));
        setExpandedRolesInactivos(prev => prev.includes(rolId) ? prev : [...prev, rolId]);
        setLiquidoPorRol(prev => ({ ...prev, [rolId]: 0 }));

        // Recargar datos en background sin romper la vista actual
        cargarDatos();
      } else {
        let mensaje = 'Error al inactivar el rol';
        try {
          const error = await response.json();
          mensaje = error?.error || mensaje;
        } catch {
          // HTML u otro formato
        }
        notifyError('Error al inactivar el rol', mensaje);
        throw new Error(mensaje);
      }
    } catch (error) {
      console.error('Error inactivando rol:', error);
      notifyError("Error al inactivar el rol", error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  // Nueva función para reactivar rol de servicio
  const reactivarRol = async (rolId: string) => {
    try {
      setSaving(true);
        const response = await fetch(`/api/roles-servicio/activar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rolId, 
          instalacionId,
          motivo: 'Reactivación desde instalación' 
        })
      });

      if (response.ok) {
        notifySuccess("Rol reactivado exitosamente", "El rol ha sido reactivado y está listo para ser utilizado");
        // Optimista: mover a activos y expandir
        setRoles(prev => prev.map(r => r.id === rolId ? { ...r, estado: 'Activo' } : r));
        setExpandedRoles(prev => prev.includes(rolId) ? prev : [...prev, rolId]);
        setExpandedRolesInactivos(prev => prev.filter(id => id !== rolId));
        // Forzar recálculo de líquido una vez reactivado
        programarRecalculo(rolId, 0);
        // Recarga suave
        cargarDatos();
      } else {
        const error = await response.json();
        notifyError("Error al reactivar el rol", error.error || 'No se pudo completar la operación');
        throw new Error(error.error || 'Error al reactivar el rol');
      }
    } catch (error) {
      console.error('Error reactivando rol:', error);
      notifyError("Error al reactivar el rol", error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  // Inactivación de estructura deshabilitada temporalmente
  // const [inactivandoRol, setInactivandoRol] = useState<string | null>(null);

  // Nueva función para inactivar estructura independientemente
  // const inactivarEstructura = async (rolId: string) => {
  //   const rol = roles.find(r => r.id === rolId);
  //   if (!rol) return;
  //   setInactivandoRol(rolId);
  // };

  // const handleConfirmarInactivacion = async (crearNueva: boolean, motivo: string) => {};

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

      {/* Roles activos y sus estructuras */}
      <div className="space-y-4">
        {roles.filter(rol => rol.estado === 'Activo').map((rol) => {
          const estructurasRol = obtenerEstructurasRol(rol.id);
          const sueldoBase = obtenerSueldoBase(rol.id);
          const totalRol = calcularTotalRol(rol.id);
          const imponibleRol = calcularImponibleRol(rol.id);
          const isExpanded = expandedRoles.includes(rol.id);

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
                          {rol.estado === 'Inactivo' && (
                            <>
                              {' · '}Inactivación: {rol.fecha_inactivacion ? new Date(rol.fecha_inactivacion).toLocaleDateString('es-CL') : '—'}
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground ml-1 mt-0.5">
                        ({isExpanded ? '−' : '+'})
                      </span>
                    </button>
                  </div>
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Estado del Rol */}
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline"
                        className="text-xs border-emerald-500 text-emerald-600 bg-emerald-500/10"
                      >
                        <Eye className="h-3 w-3 mr-1 text-emerald-600" />
                        Activo
                      </Badge>
                      
                      {/* Botones de activación/desactivación */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmInactivarRolId(rol.id)}
                          disabled={saving}
                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Inactivar rol completo"
                        >
                          <PowerOff className="h-3 w-3 mr-1" />
                          <span className="text-xs">Inactivar Rol</span>
                        </Button>
                        
                        {/* Acción de estructura deshabilitada temporalmente */}
                      </div>
                    </div>
                    
                    <div className="text-right ml-auto">
                      <p className="text-sm text-muted-foreground" title="Fonasa + AFP Modelo">Líquido Estimado</p>
                      <p className="text-lg font-bold text-emerald-600 tabular-nums">
                        ${ (Math.round(liquidoPorRol[rol.id] || 0)).toLocaleString('es-CL') }
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Botones de acción */}
                    <div className="flex items-center justify-end gap-2">
                      {!sueldoBase ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => agregarBono(rol.id, 'Sueldo Base')}
                          disabled={saving}
                          className="w-full sm:w-auto"
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
                          className="w-full sm:w-auto"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar Bono
                        </Button>
                      )}
                    </div>

                      {estructurasRol.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-[40%]">Concepto</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-center">Imponible</TableHead>
                              <TableHead className="text-center">Creado</TableHead>
                              <TableHead className="text-center">Inactivación</TableHead>
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
                                        ) : (
                                          <select
                                        className="h-8 w-full rounded-md bg-background border px-2 text-sm"
                                        value={bono.nombre_bono}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                          const value = e.target.value;
                                          actualizarBono(bonoIndex, 'nombre_bono', value);
                                          const selected = bonosGlobales.find(bg => bg.nombre === value);
                                          if (selected) {
                                            actualizarBono(bonoIndex, 'imponible', selected.imponible);
                                          }
                                        }}
                                      >
                                        <option value="">Seleccione bono…</option>
                                        {bonosGlobales.map((bg) => (
                                          <option key={bg.id} value={bg.nombre}>
                                            {bg.nombre} {bg.imponible ? '(Imp)' : '(No Imp)'}
                                          </option>
                                        ))}
                                      </select>
                                    )
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
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={bono.imponible ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {bono.imponible ? 'Sí' : 'No'}
                                  </Badge>
                                </TableCell>
                                    <TableCell className="text-center text-xs text-muted-foreground">
                                      {bono.created_at ? new Date(bono.created_at as any).toLocaleDateString('es-CL') : '—'}
                                    </TableCell>
                                    <TableCell className="text-center text-xs text-muted-foreground">
                                      {bono.fecha_inactivacion ? new Date(bono.fecha_inactivacion as any).toLocaleDateString('es-CL') : '—'}
                                    </TableCell>
                                {/* Columna de acciones por fila eliminada */}
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
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Roles inactivos y sus estructuras */}
      {roles.filter(rol => rol.estado === 'Inactivo').length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Roles Inactivos y Estructuras Disponibles</h3>
            <Badge variant="outline" className="ml-auto">
              {roles.filter(rol => rol.estado === 'Inactivo').length} Inactivos
            </Badge>
          </div>
          
          {/* Resumen de estructuras disponibles */}
          {(() => {
            const totalEstructurasInactivas = roles
              .filter(rol => rol.estado === 'Inactivo')
              .reduce((total, rol) => total + obtenerEstructurasInactivasRol(rol.id).length, 0);
            
            if (totalEstructurasInactivas > 0) {
              return (
                <Card className="border-dashed border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Estructuras Disponibles para Activación
                        </h4>
                        <p className="text-xs text-orange-600 dark:text-orange-300">
                          Hay {totalEstructurasInactivas} estructuras inactivas que puedes activar para reactivar los roles
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        {totalEstructurasInactivas} Disponibles
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}
          
          {roles.filter(rol => rol.estado === 'Inactivo').map((rol) => {
            const estructurasInactivasRol = obtenerEstructurasInactivasRol(rol.id);
            const isExpanded = expandedRolesInactivos.includes(rol.id);

            return (
              <Card key={rol.id} className="overflow-hidden border-dashed border-muted-foreground/30">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleRolInactivoExpanded(rol.id)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base text-muted-foreground">{rol.nombre}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          ({isExpanded ? '−' : '+'})
                        </span>
                      </button>
                    </div>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Estado del Rol */}
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className="text-xs border-red-500 text-red-600 bg-red-500/10"
                        >
                          <EyeOff className="h-3 w-3 mr-1 text-red-600" />
                          Inactivo
                        </Badge>
                        
                      {/* Reactivar rol eliminado de la cabecera; acción centralizada abajo */}
                         {/* Crear nueva estructura solo cuando está inactivo */}
                         <Button
                           size="sm"
                           variant="default"
                           onClick={() => crearNuevaEstructura(rol.id)}
                           disabled={saving}
                           className="h-8 px-3 rounded-full shadow-sm bg-primary text-primary-foreground hover:opacity-90"
                           title="Crear nueva estructura de sueldo"
                         >
                           <DollarSign className="h-3 w-3 mr-2" />
                           <span className="text-xs font-medium">Crear nueva estructura</span>
                         </Button>
                        
                        {/* Activación masiva de estructuras deshabilitada temporalmente */}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="space-y-4">
                      {estructurasInactivasRol.length > 0 ? (
                        <div className="rounded-lg border overflow-hidden">
                          <div className="bg-muted/30 px-4 py-2 border-b">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-muted-foreground">
                                Estructuras Disponibles para Activación ({estructurasInactivasRol.length})
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                Inactivas
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Puedes activar estas estructuras para reactivar el rol
                            </p>
                          </div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/20">
                                  <TableHead className="w-[40%]">Concepto</TableHead>
                                  <TableHead className="text-right">Monto</TableHead>
                                  <TableHead className="text-center">Imponible</TableHead>
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
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="font-mono">
                                          ${bono.monto.toLocaleString('es-CL')}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge 
                                          variant={bono.imponible ? "default" : "secondary"}
                                          className="text-xs"
                                        >
                                          {bono.imponible ? 'Sí' : 'No'}
                                        </Badge>
                                      </TableCell>
                                      {/* sin acciones por fila */}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex items-center justify-end gap-2 p-3 border-t bg-muted/30">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const base = estructurasInactivasRol.find(b => b.nombre_bono === 'Sueldo Base');
                                const target = base || estructurasInactivasRol[0];
                                if (target?.id) activarEstructuraInactiva(target.id);
                              }}
                              disabled={saving || estructurasInactivasRol.length === 0}
                              className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Power className="h-3 w-3 mr-2" />
                              <span className="text-xs">Activar estructura</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No hay estructuras inactivas para este rol</p>
                        </div>
                      )}

                      {/* Bloque adicional: mostrar estructuras inactivas del mismo rol, aún si el rol está activo */}
                      {obtenerEstructurasInactivasRol(rol.id).length > 0 && (
                        <div className="rounded-lg border mt-4 overflow-hidden">
                          <div className="bg-muted/30 px-4 py-2 border-b">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-muted-foreground">
                                Estructuras inactivas ({obtenerEstructurasInactivasRol(rol.id).length})
                              </h4>
                              <Badge variant="secondary" className="text-xs">Inactivas</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Puedes activar una estructura para reemplazar la activa
                            </p>
                          </div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/20">
                                  <TableHead className="w-[40%]">Concepto</TableHead>
                                  <TableHead className="text-right">Monto</TableHead>
                                  <TableHead className="text-center">Imponible</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {obtenerEstructurasInactivasRol(rol.id).map((bono) => {
                                  const esSueldoBase = bono.nombre_bono === 'Sueldo Base';
                                  return (
                                    <TableRow key={bono.id} className={esSueldoBase ? 'bg-primary/5' : ''}>
                                      <TableCell>
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
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="font-mono">${bono.monto.toLocaleString('es-CL')}</span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant={bono.imponible ? 'default' : 'secondary'} className="text-xs">
                                          {bono.imponible ? 'Sí' : 'No'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex items-center justify-end gap-2 p-3 border-t bg-muted/30">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const inactivas = obtenerEstructurasInactivasRol(rol.id);
                                const base = inactivas.find(b => b.nombre_bono === 'Sueldo Base');
                                const target = base || inactivas[0];
                                if (target?.id) activarEstructuraInactiva(target.id);
                              }}
                              disabled={saving || obtenerEstructurasInactivasRol(rol.id).length === 0}
                              className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Power className="h-3 w-3 mr-2" />
                              <span className="text-xs">Activar estructura</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de inactivación de estructura: deshabilitado temporalmente */}

      {/* Confirmación bonita para inactivar rol */}
      <AlertDialog open={!!confirmInactivarRolId} onOpenChange={(open) => { if (!open) setConfirmInactivarRolId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inactivar rol de servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción inactivará el rol y su estructura de sueldo asociada. Podrás reactivarlo luego desde esta misma pantalla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={async () => {
                const id = confirmInactivarRolId;
                setConfirmInactivarRolId(null);
                if (id) await inactivarRolCompleto(id);
              }}
            >
              Inactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Confirmación para reactivar rol eliminada (acción centralizada en activar estructura) */}
    </div>
  );
}
