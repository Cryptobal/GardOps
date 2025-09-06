'use client';
import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useCan } from '@/lib/can';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar, Eye, EyeOff, AlertTriangle, MoreHorizontal, ChevronDown, ChevronUp, Users, X, Zap, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { PautaRow, PautaDiariaV2Props } from './types';
import { toYmd, toDisplay } from '@/lib/date';
import * as api from './apiAdapter';

type Filtros = {
  instalacion?: string;
  estado?: string;
  ppc?: boolean | 'all';
  q?: string;
};

interface Guardia {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

const addDays = (d: string, delta: number) => {
  const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() + delta);
  return t.toISOString().slice(0,10);
};

// Helpers para estados usando estado_ui
const isAsistido = (estadoUI: string) => {
  return estadoUI === 'asistido' || estadoUI === 'reemplazo' || estadoUI === 'te';
};
const isPlan = (estadoUI: string) => estadoUI === 'plan';
const isSinCobertura = (estadoUI: string) => estadoUI === 'sin_cobertura';
const isLibre = (estadoUI: string) => estadoUI === 'libre';

const renderEstado = (estadoUI: string, isFalta: boolean) => {
  // Estados consistentes entre pauta mensual y diaria
  const cls: Record<string,string> = {
    asistio:        'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    turno_extra:    'bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20',
    sin_cobertura:  'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    // Estados legacy para compatibilidad
    asistido:       'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    reemplazo:      'bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20',
    inasistencia:   'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    libre:          'bg-gray-500/10 text-gray-400 ring-gray-500/20',
    plan:           'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    ppc_libre:      'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    te:             'bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20',
  };
  
  // Mapear estados legacy a nuevos estados consistentes
  const estadoNormalizado = (() => {
    switch (estadoUI) {
      case 'asistido':
      case 'asistio':
        return 'asistio';
      case 'reemplazo':
      case 'te':
      case 'turno_extra':
        return 'turno_extra';
      case 'sin_cobertura':
      case 'inasistencia':
        return 'sin_cobertura';
      default:
        return estadoUI;
    }
  })();
  
  const base = cls[estadoNormalizado] ?? 'bg-gray-500/10 text-gray-400 ring-gray-500/20';
  const label = estadoNormalizado === 'turno_extra' ? 'Turno Extra' : 
                estadoNormalizado === 'asistio' ? 'Asistió' : 
                estadoNormalizado === 'sin_cobertura' ? 'Sin Cobertura' : 
                estadoUI;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ring-1 ${base}`}>
      {label}
      {isFalta && <span className="ml-1 rounded px-1 text-[10px] ring-1 bg-red-500/10 text-red-400 ring-red-500/20">falta</span>}
    </span>
  );
};

export default function ClientTable({ rows: rawRows, fecha, incluirLibres = false, onRecargarDatos, activeTab = 'pauta' }: PautaDiariaV2Props) {
  
  // FORCE DEPLOYMENT - DEBUG PPC
  console.log('🚀🚀🚀 PAUTA DIARIA V2 LOADED 🚀🚀🚀');
  
  if (rawRows && rawRows.length > 0) {
    const ppcs = rawRows.filter(row => row.es_ppc === true);
    console.log('🎯 PPCs encontrados:', ppcs.length);
    ppcs.forEach(ppc => {
      console.log(`PPC: ${ppc.instalacion_nombre} - ${ppc.puesto_nombre} - Estado: ${ppc.estado_ui}`);
    });
  }
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { allowed: canMark, loading: loadingPerms } = useCan('turnos.marcar_asistencia');
  
  // Temporal: forzar permisos a true mientras se resuelve el tema de RBAC
  const canMarkOverride = true;
  const [mostrarLibres, setMostrarLibres] = useState(incluirLibres);
  const [savingId, setSavingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Estado para controlar qué fila está expandida
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [rowPanelData, setRowPanelData] = useState<{
    [key: string]: {
      type?: 'no_asistio' | 'cubrir_ppc';
      tipoCobertura?: 'con_cobertura' | 'sin_cobertura';
      motivo?: 'con_aviso' | 'sin_aviso' | 'licencia' | 'permiso' | 'vacaciones' | 'finiquito';
      guardiaReemplazo?: string;
      guardias?: Guardia[];
      loadingGuardias?: boolean;
      filtroGuardias?: string;
    }
  }>({});
  
  const [f, setF] = useState<Filtros>(() => ({ 
    ppc: 'all',
    instalacion: searchParams.get('instalacion') || undefined,
    estado: searchParams.get('estado') || 'todos',
    q: searchParams.get('q') || undefined
  }));
  const [filtersOpen, setFiltersOpen] = useState(true);
  
  // Normalizar fecha a string YYYY-MM-DD
  const fechaStr = toYmd(fecha);
  
  // Normalizar fechas en las filas por si vienen como Date objects
  const rows = useMemo(() => {
    if (!rawRows) return [];
    return rawRows.map(row => ({
      ...row,
      fecha: toYmd(row.fecha)
    }));
  }, [rawRows]);

  const refetch = useCallback(() => {
    // Actualizar datos sin recargar la página
    if (onRecargarDatos) {
      onRecargarDatos();
    }
  }, [onRecargarDatos]);

  // Detectar viewport móvil
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : (mq as any).addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', update) : (mq as any).removeListener(update);
    };
  }, []);

  // Persistir filtros en URL (excepto mostrarLibres)
  useEffect(() => {
    const params = new URLSearchParams();
    if (f.instalacion) params.set('instalacion', f.instalacion);
    if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
    if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
    if (f.q) params.set('q', f.q);
    if (incluirLibres) params.set('incluirLibres', 'true');
    
    // ✅ NAVEGAR A LA NUEVA PÁGINA SEPARADA
    const newUrl = `/pauta-diaria?fecha=${fechaStr}${params.toString() ? '&' + params.toString() : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [f.instalacion, f.estado, f.ppc, f.q, incluirLibres, fechaStr]);

  // Sincronizar mostrarLibres con incluirLibres cuando cambia desde fuera
  useEffect(() => {
    setMostrarLibres(incluirLibres);
  }, [incluirLibres]);

  // Manejar cambio de mostrarLibres sin actualizar URL
  useEffect(() => {
    if (onRecargarDatos && mostrarLibres !== incluirLibres) {
      onRecargarDatos(mostrarLibres);
    }
  }, [mostrarLibres, incluirLibres, onRecargarDatos]);

  const go = useCallback((delta:number) => {
    const params = new URLSearchParams();
    if (f.instalacion) params.set('instalacion', f.instalacion);
    if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
    if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
    if (f.q) params.set('q', f.q);
    if (mostrarLibres) params.set('incluirLibres', 'true');
    
    // ✅ NAVEGAR A LA NUEVA PÁGINA SEPARADA
    const newUrl = `/pauta-diaria?fecha=${addDays(fechaStr, delta)}${params.toString() ? '&' + params.toString() : ''}`;
    router.push(newUrl);
  }, [f.instalacion, f.estado, f.ppc, f.q, mostrarLibres, fechaStr, router]);

  const goTo = useCallback((dateYmd: string) => {
    const params = new URLSearchParams();
    if (f.instalacion) params.set('instalacion', f.instalacion);
    if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
    if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
    if (f.q) params.set('q', f.q);
    if (mostrarLibres) params.set('incluirLibres', 'true');
    
    // ✅ NAVEGAR A LA NUEVA PÁGINA SEPARADA
    const newUrl = `/pauta-diaria?fecha=${dateYmd}${params.toString() ? '&' + params.toString() : ''}`;
    router.push(newUrl);
  }, [f.instalacion, f.estado, f.ppc, f.q, mostrarLibres, router]);
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // Ajustar estado inicial de filtros según viewport
  useEffect(() => {
    setFiltersOpen(!isMobile);
  }, [isMobile]);

  // Función para cargar guardias disponibles
  const loadGuardias = useCallback(async (row: PautaRow, excluirGuardiaId?: string) => {
    const fechaNorm = toYmd(fecha);
    const url = new URL('/api/guardias/disponibles', location.origin);
    url.searchParams.set('fecha', fechaNorm);
    url.searchParams.set('instalacion_id', row.instalacion_id.toString());
    
    if (row.rol_id) {
      url.searchParams.set('rol_id', row.rol_id);
    }
    
    if (excluirGuardiaId) {
      url.searchParams.set('excluir_guardia_id', excluirGuardiaId);
    }

    setRowPanelData(prev => ({
      ...prev,
      [row.pauta_id]: {
        ...prev[row.pauta_id],
        loadingGuardias: true
      }
    }));

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error desconocido');
      }
      const data = await res.json();
      
      setRowPanelData(prev => ({
        ...prev,
        [row.pauta_id]: {
          ...prev[row.pauta_id],
          guardias: data.items || [],
          loadingGuardias: false
        }
      }));
    } catch (err: any) {
      console.error('Error cargando guardias disponibles:', err);
      addToast({
        title: "Error",
        description: err.message || "No se pudieron cargar los guardias disponibles",
        type: "error"
      });
      setRowPanelData(prev => ({
        ...prev,
        [row.pauta_id]: {
          ...prev[row.pauta_id],
          guardias: [],
          loadingGuardias: false
        }
      }));
    }
  }, [fecha, addToast]);

  // Función para expandir/colapsar panel con tipo de acción
  const toggleRowPanel = useCallback((row: PautaRow, actionType?: 'no_asistio' | 'cubrir_ppc') => {
    if (expandedRowId === row.pauta_id && !actionType) {
      // Colapsar si ya está expandido y no hay nuevo tipo
      setExpandedRowId(null);
      setRowPanelData(prev => {
        const newData = { ...prev };
        delete newData[row.pauta_id];
        return newData;
      });
    } else {
      // Expandir con el tipo de acción
      setExpandedRowId(row.pauta_id);
      
      // Inicializar datos del panel
      setRowPanelData(prev => ({
        ...prev,
        [row.pauta_id]: {
          type: actionType,
          tipoCobertura: 'sin_cobertura',
          motivo: 'sin_aviso',
          guardiaReemplazo: '',
          filtroGuardias: '',
          ...prev[row.pauta_id]
        }
      }));

      // Cargar guardias si es necesario
      if (actionType === 'cubrir_ppc') {
        loadGuardias(row);
      }
      // Para 'no_asistio', NO cargar guardias automáticamente
      // Se cargarán cuando el usuario haga clic en "Con cobertura"
    }
  }, [expandedRowId, rowPanelData, loadGuardias]);

  // Manejadores de acciones optimizadas con optimistic UI
  async function onAsistio(id: string) {
    // Optimistic update
    const originalRow = rows.find(r => r.pauta_id === id);
    if (originalRow) {
      // Aquí aplicaríamos el cambio optimista si tuviéramos estado local
    }

    try {
      setSavingId(id);
      await api.marcarAsistencia(id);
      addToast({
        title: "✅ Éxito",
        description: "Asistencia marcada",
        type: "success"
      });
      
      // Actualizar datos sin recargar la página
      if (onRecargarDatos) {
        await onRecargarDatos();
      }
    } catch (e:any) {
      addToast({
        title: "❌ Error",
        description: `Error al marcar asistencia: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  // Función para validar que un guardia no esté asignado a múltiples turnos el mismo día
  const validarGuardiaDisponible = (guardiaId: string, fecha: string, pautaIdExcluir?: string) => {
    const turnosDelDia = rows.filter(r => 
      r.fecha === fecha && 
      r.pauta_id !== pautaIdExcluir &&
      (r.guardia_trabajo_id === guardiaId || 
       r.guardia_titular_id === guardiaId ||
       r.cobertura_guardia_nombre || 
       r.reemplazo_guardia_nombre ||
       r.meta?.cobertura_guardia_id === guardiaId)
    );
    
    if (turnosDelDia.length > 0) {
      const turnosInfo = turnosDelDia.map(t => `${t.instalacion_nombre} - ${t.rol_nombre}`).join(', ');
      throw new Error(`El guardia ya está asignado en otro turno el mismo día: ${turnosInfo}`);
    }
  };

  async function onNoAsistioConfirm(row: PautaRow) {
    const panelData = rowPanelData[row.pauta_id];
    if (!panelData) return;

    const falta_sin_aviso = panelData.motivo === 'sin_aviso';
    const motivo = panelData.motivo === 'sin_aviso' ? 'Falta sin aviso' : 
                   panelData.motivo === 'con_aviso' ? 'Falta con aviso' :
                   panelData.motivo === 'licencia' ? 'Licencia médica' :
                   panelData.motivo === 'permiso' ? 'Permiso' :
                   panelData.motivo === 'vacaciones' ? 'Vacaciones' :
                   panelData.motivo === 'finiquito' ? 'Finiquito' : panelData.motivo;
    const cubierto_por = panelData.tipoCobertura === 'con_cobertura' && panelData.guardiaReemplazo ? 
                         panelData.guardiaReemplazo : null;

    // Validar que el guardia de cobertura no esté asignado a otro turno
    if (cubierto_por) {
      try {
        validarGuardiaDisponible(cubierto_por, row.fecha, row.pauta_id);
      } catch (error: any) {
        addToast({
          title: "❌ Error de validación",
          description: error.message,
          type: "error"
        });
        return;
      }
    }

    try {
      setSavingId(row.pauta_id);
      await api.registrarInasistencia(
        row.pauta_id,
        falta_sin_aviso,
        motivo || 'Sin especificar',
        cubierto_por
      );
      addToast({
        title: "✅ Éxito",
        description: "Inasistencia registrada",
        type: "success"
      });
      setExpandedRowId(null);
      setRowPanelData(prev => {
        const newData = { ...prev };
        delete newData[row.pauta_id];
        return newData;
      });
      
      // Actualizar datos sin recargar la página
      if (onRecargarDatos) {
        await onRecargarDatos();
      }
    } catch (e:any) {
      addToast({
        title: "❌ Error",
        description: `Error al registrar inasistencia: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  async function onCubrirPPC(row: PautaRow) {
    console.log('🔄 onCubrirPPC ejecutado:', row.pauta_id);
    const panelData = rowPanelData[row.pauta_id];
    if (!panelData?.guardiaReemplazo) {
      console.log('❌ No hay guardiaReemplazo:', panelData);
      return;
    }
    console.log('✅ Guardia para asignar:', panelData.guardiaReemplazo);

    // Validar que el guardia de cobertura no esté asignado a otro turno
    try {
      console.log('🔍 Validando guardia:', {
        guardia_id: panelData.guardiaReemplazo,
        fecha: row.fecha,
        pauta_id: row.pauta_id
      });
      validarGuardiaDisponible(panelData.guardiaReemplazo, row.fecha, row.pauta_id);
      console.log('✅ Validación exitosa');
    } catch (error: any) {
      console.log('❌ Error en validación:', error.message);
      addToast({
        title: "❌ Error de validación",
        description: error.message,
        type: "error"
      });
      return;
    }

    try {
      setSavingId(row.pauta_id);
      // Usar marcarTurnoExtra para PPC - pasar row completo para nueva API
      console.log('🔍 Llamando marcarTurnoExtra con:', {
        pauta_id: row.pauta_id,
        guardia_id: panelData.guardiaReemplazo,
        row: row
      });
      
      const result = await api.marcarTurnoExtra(
        row.pauta_id,
        panelData.guardiaReemplazo,
        row // Pasar la fila completa con fecha, instalacion_id, rol_id, puesto_id
      );
      
      console.log('✅ Resultado de marcarTurnoExtra:', result);
      addToast({
        title: "✅ Éxito",
        description: "Turno PPC cubierto",
        type: "success"
      });
      setExpandedRowId(null);
      setRowPanelData(prev => {
        const newData = { ...prev };
        delete newData[row.pauta_id];
        return newData;
      });
      
      // Actualizar datos sin recargar la página
      if (onRecargarDatos) {
        await onRecargarDatos();
      }
    } catch (e:any) {
      addToast({
        title: "❌ Error",
        description: `Error al cubrir turno PPC: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  async function onSinCoberturaPPC(pauta_id: string) {
    try {
      setSavingId(pauta_id);
      await api.marcarSinCoberturaPPC(pauta_id);
      addToast({
        title: "✅ Éxito",
        description: "Marcado sin cobertura",
        type: "success"
      });
      
      // Actualizar datos sin recargar la página
      if (onRecargarDatos) {
        await onRecargarDatos();
      }
    } catch (e:any) {
      addToast({
        title: "❌ Error",
        description: `Error al marcar sin cobertura: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  async function onDeshacer(pauta_id: string) {
    console.log('🔄 Iniciando deshacer para pauta_id:', pauta_id);
    try {
      setSavingId(pauta_id);
      const result = await api.deshacerMarcado(pauta_id);
      console.log('✅ Resultado de deshacer:', result);
      
      // Verificar si el resultado es exitoso
      if (result && result.ok !== false) {
        addToast({
          title: "✅ Éxito",
          description: "Estado revertido a planificado",
          type: "success"
        });
        
        // Cerrar el panel expandido si está abierto
        if (expandedRowId === pauta_id) {
          setExpandedRowId(null);
          setRowPanelData(prev => {
            const newData = { ...prev };
            delete newData[pauta_id];
            return newData;
          });
        }
        
        // Actualizar datos sin recargar la página
        console.log('🔄 Actualizando datos sin recarga...');
        
        if (onRecargarDatos) {
          await onRecargarDatos();
        }
      } else {
        // Si hay un error en la respuesta
        throw new Error(result?.error || 'Error al deshacer');
      }
    } catch (e:any) {
      console.error('❌ Error al deshacer:', e);
      addToast({
        title: "❌ Error",
        description: `Error al deshacer: ${e.message ?? e}`,
        type: "error"
      });
      setSavingId(null);
    }
  }

  // Reglas de visibilidad de botones según el prompt:
  const isTitularPlan = (r: PautaRow) => r.es_ppc === false && r.estado_ui === 'plan';
  const isPpcPlan     = (r: PautaRow) => r.es_ppc === true  && (r.estado_ui === 'plan' || r.estado_ui === 'ppc_libre');
  const canUndo       = (r: PautaRow) => {
    // Estados que permiten deshacer (incluyendo estados legacy y nuevos)
    const canUndoResult = [
      'asistido', 'asistio',           // Estados de asistencia
      'reemplazo', 'turno_extra', 'te', // Estados de reemplazo/turno extra
      'sin_cobertura', 'inasistencia',  // Estados de falta/sin cobertura
      'extra'                          // Estado de PPC cubierto (cobertura extra)
    ].includes(r.estado_ui);
    
    // Para PPC sin cobertura, siempre permitir deshacer
    if (r.es_ppc && r.estado_ui === 'sin_cobertura') {
      console.log('🔍 Debug canUndo PPC sin cobertura:', {
        pauta_id: r.pauta_id,
        estado_ui: r.estado_ui,
        es_ppc: r.es_ppc,
        guardia_trabajo_id: r.guardia_trabajo_id,
        canUndoResult: true
      });
      return true;
    }
    
    // Para otros casos, verificar que tenga guardia_trabajo_id y no sea plan o libre
    if (r.guardia_trabajo_id && r.estado_ui !== 'plan' && r.estado_ui !== 'libre') {
      console.log('🔍 Debug canUndo:', {
        pauta_id: r.pauta_id,
        estado_ui: r.estado_ui,
        es_ppc: r.es_ppc,
        guardia_trabajo_id: r.guardia_trabajo_id,
        canUndoResult
      });
      return canUndoResult;
    }
    
    return false;
  };

  // Detectar guardias duplicados en la misma fecha
  const guardiasDuplicados = useMemo(() => {
    const guardiasPorFecha = new Map<string, number>();
    rows.forEach(row => {
      if (row.guardia_trabajo_id) {
        const key = `${row.fecha}-${row.guardia_trabajo_id}`;
        guardiasPorFecha.set(key, (guardiasPorFecha.get(key) || 0) + 1);
      }
    });
    return guardiasPorFecha;
  }, [rows]);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r:any) => {
      // Filtrar filas con estado_ui === 'libre' cuando mostrarLibres === false
      if (!mostrarLibres && r.estado_ui === 'libre') return false;

      if (f.instalacion && `${r.instalacion_id}` !== f.instalacion && r.instalacion_nombre !== f.instalacion) return false;
      if (f.estado && f.estado !== 'todos') {
        // Ahora usamos estado_ui directamente para filtrar
        if (r.estado_ui !== f.estado) return false;
      }
      if (f.ppc !== 'all') {
        const want = f.ppc === true;
        if (Boolean(r.es_ppc) !== want) return false;
      }
      if (f.q) {
        const q = f.q.toLowerCase();
        const hay = (r.guardia_trabajo_nombre || '').toLowerCase().includes(q)
                 || (r.rol_nombre || '').toLowerCase().includes(q)
                 || (r.instalacion_nombre || '').toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [rows, f.instalacion, f.estado, f.ppc, f.q, mostrarLibres]);

  // No retornar temprano cuando no hay datos, para mantener los controles de navegación

  // Componente de panel inline para una fila
  const RowPanel = ({ row }: { row: PautaRow }) => {
    const panelData = rowPanelData[row.pauta_id] || {};
    const isLoading = savingId === row.pauta_id;
    
    // Filtrar guardias client-side
    const guardiasFiltradas = useMemo(() => {
      if (!panelData.guardias) return [];
      if (!panelData.filtroGuardias) return panelData.guardias;
      const filtroLower = panelData.filtroGuardias.toLowerCase();
      return panelData.guardias.filter((g: Guardia) => 
        g.nombre_completo.toLowerCase().includes(filtroLower)
      );
    }, [panelData.guardias, panelData.filtroGuardias]);

    const updatePanelData = (updates: Partial<typeof panelData>) => {
      setRowPanelData(prev => ({
        ...prev,
        [row.pauta_id]: {
          ...prev[row.pauta_id],
          ...updates
        }
      }));
    };

    // No usar useEffect para cargar guardias, se hace directamente en onClick para evitar loops

    return (
      <TableRow>
        <TableCell colSpan={7} className="p-0">
          <div className="bg-muted/50 dark:bg-muted/20 border-t">
            <div className="p-4 space-y-4">
              {/* Header del panel con título y botón cerrar */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {panelData.type === 'no_asistio' ? '📝 Registrar No Asistencia' : 
                   panelData.type === 'cubrir_ppc' ? '👥 Cubrir Turno PPC' : 
                   '⚙️ Acciones'}
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleRowPanel(row)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Contenido según el tipo de panel */}
              {panelData.type === 'no_asistio' && (
                <div className="space-y-4">
                  {/* Selector de motivo */}
                  <div className="space-y-2">
                    <Label className="text-sm">Motivo de inasistencia</Label>
                    <Select 
                      value={panelData.motivo || 'sin_aviso'} 
                      onValueChange={(value: any) => updatePanelData({ motivo: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="con_aviso">Con aviso</SelectItem>
                        <SelectItem value="sin_aviso">Sin aviso</SelectItem>
                        <SelectItem value="licencia">Licencia</SelectItem>
                        <SelectItem value="permiso">Permiso</SelectItem>
                        <SelectItem value="vacaciones">Vacaciones</SelectItem>
                        <SelectItem value="finiquito">Finiquito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botones toggle para tipo de cobertura */}
                  <div className="space-y-2">
                    <Label className="text-sm">Tipo de cobertura</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={panelData.tipoCobertura === 'sin_cobertura' ? 'default' : 'outline'}
                        onClick={() => updatePanelData({ tipoCobertura: 'sin_cobertura' })}
                        className="flex-1"
                      >
                        ⛔ Sin cobertura
                      </Button>
                      <Button
                        size="sm"
                        variant={panelData.tipoCobertura === 'con_cobertura' ? 'default' : 'outline'}
                        onClick={() => {
                          updatePanelData({ tipoCobertura: 'con_cobertura' });
                          // Cargar guardias inmediatamente si no están cargados
                          if (!panelData.guardias && !panelData.loadingGuardias) {
                            loadGuardias(row, row.guardia_trabajo_id || undefined);
                          }
                        }}
                        className="flex-1"
                      >
                        ✅ Con cobertura
                      </Button>
                    </div>
                  </div>

                  {/* Selector de guardia si es con cobertura */}
                  {panelData.tipoCobertura === 'con_cobertura' && (
                    <div className="space-y-2">
                      <Label className="text-sm">Guardia de reemplazo</Label>
                      
                      {/* Input de búsqueda */}
                      <Input
                        type="text"
                        placeholder="🔍 Buscar guardia por nombre..."
                        value={panelData.filtroGuardias || ''}
                        onChange={(e) => updatePanelData({ filtroGuardias: e.target.value })}
                        className="mb-2"
                      />
                      
                      <Select 
                        value={panelData.guardiaReemplazo || ''} 
                        onValueChange={(value) => updatePanelData({ guardiaReemplazo: value })}
                        disabled={panelData.loadingGuardias || guardiasFiltradas.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona guardia" />
                        </SelectTrigger>
                        <SelectContent>
                          {panelData.loadingGuardias ? (
                            <SelectItem value="loading" disabled>Cargando guardias disponibles...</SelectItem>
                          ) : guardiasFiltradas.length === 0 ? (
                            <SelectItem value="empty" disabled>
                              {panelData.filtroGuardias ? 'No se encontraron guardias con ese filtro' : 'No hay guardias disponibles'}
                            </SelectItem>
                          ) : (
                            guardiasFiltradas.map((g: Guardia) => (
                              <SelectItem 
                                key={g.id} 
                                value={g.id}
                                disabled={g.id === row.guardia_trabajo_id}
                              >
                                {g.nombre_completo}
                                {g.id === row.guardia_trabajo_id && (
                                  <span className="ml-2 text-xs text-muted-foreground">(Titular actual)</span>
                                )}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      
                      {guardiasFiltradas.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {guardiasFiltradas.length} guardia{guardiasFiltradas.length !== 1 ? 's' : ''} disponible{guardiasFiltradas.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleRowPanel(row)} 
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => onNoAsistioConfirm(row)}
                      disabled={
                        isLoading || 
                        (panelData.tipoCobertura === 'con_cobertura' && !panelData.guardiaReemplazo)
                      }
                    >
                      {isLoading ? 'Guardando...' : 'Confirmar'}
                    </Button>
                  </div>
                </div>
              )}

              {panelData.type === 'cubrir_ppc' && (
                <div className="space-y-4">
                  {/* Selector de guardia para PPC */}
                  <div className="space-y-2">
                    <Label className="text-sm">Guardia para cubrir turno</Label>
                    
                    {/* Input de búsqueda */}
                    <Input
                      type="text"
                      placeholder="🔍 Buscar guardia por nombre..."
                      value={panelData.filtroGuardias || ''}
                      onChange={(e) => updatePanelData({ filtroGuardias: e.target.value })}
                      className="mb-2"
                    />
                    
                    <Select 
                      value={panelData.guardiaReemplazo || ''} 
                      onValueChange={(value) => {
                        console.log('🔄 PPC SELECT CHANGED:', value);
                        updatePanelData({ guardiaReemplazo: value });
                      }}
                      disabled={panelData.loadingGuardias || guardiasFiltradas.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona guardia" />
                      </SelectTrigger>
                      <SelectContent>
                        {panelData.loadingGuardias ? (
                          <SelectItem value="loading" disabled>Cargando guardias disponibles...</SelectItem>
                        ) : guardiasFiltradas.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            {panelData.filtroGuardias ? 'No se encontraron guardias con ese filtro' : 'No hay guardias disponibles'}
                          </SelectItem>
                        ) : (
                          guardiasFiltradas.map((g: Guardia) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.nombre_completo}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    
                    {guardiasFiltradas.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {guardiasFiltradas.length} guardia{guardiasFiltradas.length !== 1 ? 's' : ''} disponible{guardiasFiltradas.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleRowPanel(row)} 
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        console.log('🖱️ CONFIRMAR CLICKED:', panelData.guardiaReemplazo);
                        onCubrirPPC(row);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Guardando...' : 'Confirmar'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Panel genérico de acciones cuando no hay tipo específico */}
              {!panelData.type && (
                <div className="space-y-3">
                  {/* Titular en plan: Asistió / No asistió */}
                  {isTitularPlan(row) && canMarkOverride && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        disabled={isLoading} 
                        onClick={() => onAsistio(row.pauta_id)}
                      >
                        {isLoading ? 'Guardando...' : '✅ Asistió'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        disabled={isLoading} 
                        onClick={() => {
                          updatePanelData({ 
                            type: 'no_asistio',
                            tipoCobertura: 'sin_cobertura', // Inicializar con sin_cobertura por defecto
                            guardias: undefined,
                            loadingGuardias: false
                          });
                        }}
                      >
                        ❌ No asistió
                      </Button>
                    </div>
                  )}

                  {/* PPC en plan: Cubrir / Sin cobertura */}
                  {isPpcPlan(row) && canMarkOverride && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        disabled={isLoading} 
                        onClick={() => {
                          console.log('🖱️ CUBRIR CLICKED - PPC ID:', row.pauta_id);
                          updatePanelData({ 
                            type: 'cubrir_ppc',
                            guardias: undefined,
                            loadingGuardias: false,
                            guardiaReemplazo: '',
                            filtroGuardias: ''
                          });
                          setTimeout(() => loadGuardias(row), 0);
                        }}
                      >
                        👥 Cubrir
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        disabled={isLoading} 
                        onClick={() => onSinCoberturaPPC(row.pauta_id)}
                      >
                        ⛔ Sin cobertura
                      </Button>
                    </div>
                  )}

                  {/* Deshacer para estados asistido/reemplazo/sin_cobertura */}
                  {canUndo(row) && canMarkOverride && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="w-full"
                      disabled={isLoading} 
                      onClick={() => onDeshacer(row.pauta_id)}
                    >
                      {isLoading ? 'Guardando...' : '↩️ Deshacer'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Componente Mobile: card por fila con panel embebido
  const MobileRowCard: React.FC<{ row: PautaRow }> = ({ row }) => {
    const isExpanded = expandedRowId === row.pauta_id;
    const isLoading = savingId === row.pauta_id;
    
    // DEBUG: Verificar estado de savingId
    if (row.es_ppc && isLoading) {
      console.log('🚨 PPC BLOQUEADO POR savingId:', {
        pauta_id: row.pauta_id,
        savingId,
        isLoading,
        isPPC: row.es_ppc
      });
    }
    const esDuplicado = row.guardia_trabajo_id && (guardiasDuplicados.get(`${row.fecha}-${row.guardia_trabajo_id}`) || 0) > 1;
    const esPPC = row.es_ppc || !row.guardia_trabajo_id;

    const panelData = rowPanelData[row.pauta_id] || {};
    const updatePanelData = (updates: any) => {
      setRowPanelData(prev => ({ ...prev, [row.pauta_id]: { ...prev[row.pauta_id], ...updates } }));
    };

    // Filtrado de guardias en móvil
    const guardiasFiltradas = useMemo(() => {
      const list = panelData.guardias || [];
      const q = (panelData.filtroGuardias || '').toLowerCase();
      if (!q) return list;
      return list.filter((g: Guardia) => g.nombre_completo.toLowerCase().includes(q));
    }, [panelData.guardias, panelData.filtroGuardias]);

    return (
      <Card className={esDuplicado ? 'border-yellow-300' : ''}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{row.instalacion_nombre}</div>
              <div className="text-base font-semibold">
                {row.rol_alias || row.rol_nombre?.split('/')[0]?.trim() || '—'}
              </div>
              {row.hora_inicio && row.hora_fin && (
                <div className="text-xs text-muted-foreground">{row.hora_inicio.slice(0,5)} - {row.hora_fin.slice(0,5)}</div>
              )}
            </div>
            <div>{renderEstado(row.estado_ui, row.es_falta_sin_aviso)}</div>
          </div>

          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{esPPC ? 'PPC' : (row.guardia_titular_nombre || row.guardia_trabajo_nombre || '—')}</span>
              {esDuplicado && (
                <Badge variant="destructive" className="text-xs">Duplicado</Badge>
              )}
            </div>
            {row.estado_ui === 'te' && (row.cobertura_guardia_nombre || row.meta?.cobertura_guardia_id) && (
              <div className="text-xs text-muted-foreground mt-1">Cobertura: {row.cobertura_guardia_nombre || 'Guardia de cobertura'}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isTitularPlan(row) && (
              <>
                <Button size="sm" disabled={isLoading} onClick={() => onAsistio(row.pauta_id)} className="flex-1">✅ Asistió</Button>
                <Button size="sm" variant="outline" disabled={isLoading} className="flex-1" onClick={() => toggleRowPanel(row, 'no_asistio')}>❌ No asistió</Button>
              </>
            )}
            {isPpcPlan(row) && (
              <>
                <Button size="sm" variant="outline" disabled={isLoading} className="flex-1" onClick={() => { toggleRowPanel(row, 'cubrir_ppc'); setTimeout(()=>loadGuardias(row),0); }}>👥 Cubrir</Button>
                <Button size="sm" variant="outline" disabled={isLoading} className="flex-1" onClick={() => onSinCoberturaPPC(row.pauta_id)}>⛔ Sin cobertura</Button>
              </>
            )}
            {canUndo(row) && (
              <Button size="sm" variant="secondary" disabled={isLoading} className="w-full" onClick={() => onDeshacer(row.pauta_id)}>↩️ Deshacer</Button>
            )}
          </div>

          {/* Botones de contacto: Llamar y WhatsApp */}
          {(row.guardia_trabajo_telefono || row.cobertura_guardia_telefono || row.guardia_titular_telefono) && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">📞 Contacto del guardia</div>
              <div className="flex gap-2">
                {/* Botón Llamar */}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const telefono = row.guardia_trabajo_telefono || row.cobertura_guardia_telefono || row.guardia_titular_telefono;
                    if (telefono) {
                      llamarTelefono(telefono);
                    }
                  }}
                >
                  📞 Llamar
                </Button>
                
                {/* Botón WhatsApp */}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const telefono = row.guardia_trabajo_telefono || row.cobertura_guardia_telefono || row.guardia_titular_telefono;
                    if (telefono) {
                      abrirWhatsApp(telefono);
                    }
                  }}
                >
                  💬 WhatsApp
                </Button>
              </div>
              
              {/* Mostrar información del guardia contactado */}
              <div className="text-xs text-muted-foreground">
                {row.cobertura_guardia_telefono && (
                  <span>📱 Cobertura: {row.cobertura_guardia_nombre || 'Guardia de cobertura'}</span>
                )}
                {!row.cobertura_guardia_telefono && row.guardia_trabajo_telefono && (
                  <span>📱 Trabajando: {row.guardia_trabajo_nombre || 'Guardia asignado'}</span>
                )}
                {!row.cobertura_guardia_telefono && !row.guardia_trabajo_telefono && row.guardia_titular_telefono && (
                  <span>📱 Titular: {row.guardia_titular_nombre || 'Guardia titular'}</span>
                )}
              </div>
            </div>
          )}

          {isExpanded && (
            <div className="mt-2 p-3 rounded border bg-muted/30 space-y-3">
              {panelData.type === 'no_asistio' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-sm">Motivo de inasistencia</Label>
                    <Select value={panelData.motivo || 'sin_aviso'} onValueChange={(v:any)=>updatePanelData({ motivo: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione motivo"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="con_aviso">Con aviso</SelectItem>
                        <SelectItem value="sin_aviso">Sin aviso</SelectItem>
                        <SelectItem value="licencia">Licencia</SelectItem>
                        <SelectItem value="permiso">Permiso</SelectItem>
                        <SelectItem value="vacaciones">Vacaciones</SelectItem>
                        <SelectItem value="finiquito">Finiquito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Tipo de cobertura</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={panelData.tipoCobertura==='sin_cobertura'?'default':'outline'} className="flex-1" onClick={()=>updatePanelData({ tipoCobertura: 'sin_cobertura' })}>⛔ Sin cobertura</Button>
                      <Button size="sm" variant={panelData.tipoCobertura==='con_cobertura'?'default':'outline'} className="flex-1" onClick={()=>{ updatePanelData({ tipoCobertura: 'con_cobertura' }); if(!panelData.guardias && !panelData.loadingGuardias) loadGuardias(row, row.guardia_trabajo_id||undefined); }}>✅ Con cobertura</Button>
                    </div>
                  </div>
                  {panelData.tipoCobertura==='con_cobertura' && (
                    <div className="space-y-2">
                      <Label className="text-sm">Guardia de reemplazo</Label>
                      <Input placeholder="🔍 Buscar guardia…" value={panelData.filtroGuardias||''} onChange={(e)=>updatePanelData({ filtroGuardias: e.target.value })}/>
                      <Select value={panelData.guardiaReemplazo || ''} onValueChange={(v)=>updatePanelData({ guardiaReemplazo: v })} disabled={panelData.loadingGuardias || guardiasFiltradas.length===0}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona guardia"/></SelectTrigger>
                        <SelectContent>
                          {panelData.loadingGuardias ? <SelectItem value="loading" disabled>Cargando…</SelectItem> : (
                            guardiasFiltradas.length===0 ? <SelectItem value="empty" disabled>Sin resultados</SelectItem> : (
                              guardiasFiltradas.map((g: Guardia)=>(<SelectItem key={g.id} value={g.id}>{g.nombre_completo}</SelectItem>))
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={()=>toggleRowPanel(row)} disabled={isLoading}>Cancelar</Button>
                    <Button size="sm" onClick={()=>onNoAsistioConfirm(row)} disabled={isLoading || (panelData.tipoCobertura==='con_cobertura' && !panelData.guardiaReemplazo)}>
                      {isLoading?'Guardando…':'Confirmar'}
                    </Button>
                  </div>
                </>
              )}

              {panelData.type === 'cubrir_ppc' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Guardia para cubrir</Label>
                    <Input placeholder="🔍 Buscar guardia…" value={panelData.filtroGuardias||''} onChange={(e)=>updatePanelData({ filtroGuardias: e.target.value })}/>
                    <Select value={panelData.guardiaReemplazo || ''} onValueChange={(v)=>updatePanelData({ guardiaReemplazo: v })} disabled={panelData.loadingGuardias || guardiasFiltradas.length===0}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona guardia"/></SelectTrigger>
                      <SelectContent>
                        {panelData.loadingGuardias ? <SelectItem value="loading" disabled>Cargando…</SelectItem> : (
                          guardiasFiltradas.length===0 ? <SelectItem value="empty" disabled>Sin resultados</SelectItem> : (
                            guardiasFiltradas.map((g: Guardia)=>(<SelectItem key={g.id} value={g.id}>{g.nombre_completo}</SelectItem>))
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={()=>toggleRowPanel(row)} disabled={isLoading}>Cancelar</Button>
                    <Button size="sm" onClick={()=>{
                      console.log('📱 MOBILE CONFIRMAR:', panelData.guardiaReemplazo);
                      console.log('🚨 Estado antes de confirmar:', { savingId, isLoading, pauta_id: row.pauta_id });
                      if (isLoading) {
                        console.log('🚨 FORZANDO LIMPIEZA DE savingId');
                        setSavingId(null);
                      }
                      onCubrirPPC(row);
                    }} disabled={isLoading}>{isLoading?'Guardando…':'Confirmar'}</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Función para manejar cambios de estado del semáforo
  const handleEstadoChange = useCallback(async (pautaId: string, nuevoEstado: string) => {
    // Guardar en base de datos
    try {
      const response = await fetch(`/api/pauta-diaria-v2/semaforo/${pautaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      if (!response.ok) {
        throw new Error('Error al guardar estado del semáforo');
      }
      
      addToast({
        title: "✅ Estado guardado",
        description: `Estado cambiado a ${nuevoEstado}`,
        type: "success"
      });
      
      // Actualizar datos sin recargar la página
      if (onRecargarDatos) {
        await onRecargarDatos();
      }
    } catch (error) {
      console.error('Error guardando estado del semáforo:', error);
      addToast({
        title: "❌ Error",
        description: "No se pudo guardar el estado del semáforo",
        type: "error"
      });
    }
  }, [addToast, router]);

  // Función para abrir WhatsApp
  const abrirWhatsApp = useCallback((tel: string) => {
    const url = `https://wa.me/${tel.replace(/\D/g, '')}`;
    window.open(url, '_blank');
  }, []);

  // Función para llamar al teléfono
  const llamarTelefono = useCallback((tel: string) => {
    const url = `tel:${tel}`;
    window.open(url, '_blank');
  }, []);

  // Función para guardar comentarios
  const guardarComentario = useCallback(async (pautaId: string, comentario: string) => {
    try {
      const response = await fetch(`/api/pauta-diaria-v2/comentarios/${pautaId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comentario })
      });
      
      if (!response.ok) {
        throw new Error('Error al guardar comentario');
      }
      
      addToast({
        title: "✅ Comentario guardado",
        description: "Comentario guardado exitosamente",
        type: "success"
      });
    } catch (error) {
      console.error('Error guardando comentario:', error);
      addToast({
        title: "❌ Error",
        description: "No se pudo guardar el comentario",
        type: "error"
      });
    }
  }, [addToast]);

  return (
    <TooltipProvider>
      <>
        {/* Header fecha + nav - Mobile First */}
        <Card className="mb-3 w-full">
          <CardContent className="p-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {/* En móvil, ocultamos navegación superior para no duplicar con bottom bar */}
                {!isMobile && (
                  <>
                    <Button variant="outline" size="sm" onClick={()=>go(-1)}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <div className="flex items-stretch gap-1">
                      <Input
                        ref={inputRef}
                        type="date"
                        className="w-auto text-xs"
                        value={fechaStr}
                        onChange={(e) => {
                          const params = new URLSearchParams();
                          if (f.instalacion) params.set('instalacion', f.instalacion);
                          if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
                          if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
                          if (f.q) params.set('q', f.q);
                          if (mostrarLibres) params.set('incluirLibres', 'true');
                          
                          // ✅ NAVEGAR A LA NUEVA PÁGINA SEPARADA
                          const newUrl = `/pauta-diaria?fecha=${e.target.value}${params.toString() ? '&' + params.toString() : ''}`;
                          router.push(newUrl);
                        }}
                      />
                      <Button
                        aria-label="Abrir calendario"
                        variant="outline"
                        size="sm"
                        onClick={()=>inputRef.current?.showPicker?.()}
                      >
                        <Calendar className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const hoy = toYmd(new Date());
                        const params = new URLSearchParams();
                        if (f.instalacion) params.set('instalacion', f.instalacion);
                        if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
                        if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
                        if (f.q) params.set('q', f.q);
                        if (mostrarLibres) params.set('incluirLibres', 'true');
                        
                        // ✅ NAVEGAR A LA NUEVA PÁGINA SEPARADA
                        const newUrl = `/pauta-diaria?fecha=${hoy}${params.toString() ? '&' + params.toString() : ''}`;
                        router.push(newUrl);
                      }}
                    >
                      Hoy
                    </Button>
                    <Button variant="outline" size="sm" onClick={()=>go(1)}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </>
                )}

              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {mostrarLibres ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  <Switch
                    checked={mostrarLibres}
                    onCheckedChange={setMostrarLibres}
                  />
                  <span className="text-xs">Ver libres</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controles de filtro - Mobile First */}
        <Card className="mb-3 w-full">
          <CardContent className="p-3">
            {/* Toggle filtros para móvil */}
            {isMobile && (
              <div className="mb-2 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={()=>setFiltersOpen(o=>!o)} className="text-xs">
                  {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                </Button>
              </div>
            )}
            {(!isMobile || filtersOpen) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              <Input
                placeholder="Filtrar instalación…"
                value={f.instalacion ?? ''} 
                onChange={e=>setF(s=>({ ...s, instalacion: e.target.value || undefined }))}
                className="text-xs"
              />
              
              <Select value={f.estado ?? 'todos'} onValueChange={(value) => setF(s=>({ ...s, estado: value === 'todos' ? undefined : value }))}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Estado (todos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Estado (todos)</SelectItem>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="ppc_libre">PPC Libre</SelectItem>
                  <SelectItem value="asistido">Asistido</SelectItem>
                  <SelectItem value="libre">Libre</SelectItem>
                  <SelectItem value="reemplazo">Reemplazo</SelectItem>
                  <SelectItem value="sin_cobertura">Sin cobertura</SelectItem>
                  <SelectItem value="inasistencia">Inasistencia</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={f.ppc === 'all' ? 'all' : f.ppc === true ? 'true' : 'false'} 
                      onValueChange={(value) => {
                        const v = value as 'all'|'true'|'false';
                        setF(s=>({ ...s, ppc: v === 'all' ? 'all' : v === 'true' }));
                      }}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="PPC (todos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Solo PPC</SelectItem>
                  <SelectItem value="false">Solo con guardia</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Buscar guardia / rol / instalación…"
                value={f.q ?? ''} 
                onChange={e=>setF(s=>({ ...s, q: e.target.value || undefined }))}
                className="text-xs"
              />
              
              <Button variant="outline" size="sm" onClick={()=>setF({ ppc:'all' })} className="text-xs">
                Limpiar
              </Button>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Vista Desktop (tabla) u opción Mobile (cards) - Mobile First */}
        {!isMobile ? (
          <Card className="w-full">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Instalación</TableHead>
                    <TableHead className="text-xs">Rol</TableHead>
                    <TableHead className="hidden md:table-cell text-xs">Puesto</TableHead>
                    <TableHead className="text-xs">Guardia</TableHead>
                    <TableHead className="text-xs">Cobertura</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? (
                    filtered.map((r:PautaRow) => {
                    const isExpanded = expandedRowId === r.pauta_id;
                    const esDuplicado = r.guardia_trabajo_id && (guardiasDuplicados.get(`${r.fecha}-${r.guardia_trabajo_id}`) || 0) > 1;
                    const isLoading = savingId === r.pauta_id;
                    return (
                      <React.Fragment key={r.pauta_id}>
                        <TableRow className={esDuplicado ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}>
                          <TableCell className="text-xs">{r.instalacion_nombre}</TableCell>
                          <TableCell>
                            {r.rol_nombre ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-xs">{r.rol_alias || r.rol_nombre.split('/')[0].trim()}</span>
                                {r.hora_inicio && r.hora_fin && (
                                  <span className="text-xs text-muted-foreground">{r.hora_inicio.slice(0,5)} - {r.hora_fin.slice(0,5)}</span>
                                )}
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono text-xs cursor-help">{r.puesto_nombre ?? `${r.puesto_id.slice(0,8)}…`}</span>
                              </TooltipTrigger>
                              <TooltipContent><p>UUID: {r.puesto_id}</p></TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {r.es_ppc ? (
                              <span className="rounded-md border px-1.5 py-0.5 text-[10px] bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">PPC</span>
                            ) : (
                              r.guardia_titular_nombre || r.guardia_trabajo_nombre || '—'
                            )}
                            {esDuplicado && (
                              <Badge variant="destructive" className="text-xs mt-1"><AlertTriangle className="h-3 w-3 mr-1"/>Duplicado</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(r.cobertura_guardia_nombre || r.reemplazo_guardia_nombre || r.meta?.cobertura_guardia_id) ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-xs">{r.cobertura_guardia_nombre || r.reemplazo_guardia_nombre || 'Guardia de cobertura'}</span>
                                {r.meta?.motivo && (<span className="text-xs text-muted-foreground">{r.meta.motivo}</span>)}
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <div>{renderEstado(r.estado_ui, r.es_falta_sin_aviso)}</div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const isTitular = isTitularPlan(r);
                              const isPpc = isPpcPlan(r);
                              const canUndoResult = canUndo(r);
                              const hasActions = isTitular || isPpc || canUndoResult;
                              const showButton = !loadingPerms && canMarkOverride && hasActions;
                              
                              if (!showButton) return <span className="text-xs text-muted-foreground">—</span>;
                              
                              return (
                                <div className="flex flex-col gap-1">
                                  {isTitular && (
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        disabled={isLoading} 
                                        onClick={() => onAsistio(r.pauta_id)} 
                                        className="h-6 px-2 text-xs"
                                      >
                                        ✅ Asistió
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled={isLoading} 
                                        className="h-6 px-2 text-xs" 
                                        onClick={() => toggleRowPanel(r, 'no_asistio')}
                                      >
                                        ❌ No asistió
                                      </Button>
                                    </div>
                                  )}
                                  {isPpc && (
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled={isLoading} 
                                        className="h-6 px-2 text-xs" 
                                        onClick={() => { 
                                          toggleRowPanel(r, 'cubrir_ppc'); 
                                          setTimeout(()=>loadGuardias(r),0); 
                                        }}
                                      >
                                        👥 Cubrir
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled={isLoading} 
                                        className="h-6 px-2 text-xs" 
                                        onClick={() => onSinCoberturaPPC(r.pauta_id)}
                                      >
                                        ⛔ Sin cobertura
                                      </Button>
                                    </div>
                                  )}
                                  {canUndoResult && (
                                    <Button 
                                      size="sm" 
                                      variant="secondary" 
                                      disabled={isLoading} 
                                      className="h-6 px-2 text-xs" 
                                      onClick={() => onDeshacer(r.pauta_id)}
                                    >
                                      ↩️ Deshacer
                                    </Button>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                        {isExpanded && <RowPanel row={r} />}
                      </React.Fragment>
                    );
                  })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Calendar className="h-8 w-8 opacity-50" />
                          <p className="text-sm">Sin datos para {toDisplay(fechaStr)}</p>
                          <p className="text-xs">Usa los controles de navegación para cambiar de fecha</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.length > 0 ? (
              filtered.map((r:PautaRow) => (
                <MobileRowCard key={r.pauta_id} row={r} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Calendar className="h-12 w-12 opacity-50" />
                    <div>
                      <p className="text-sm font-medium">Sin datos para {toDisplay(fechaStr)}</p>
                      <p className="text-xs mt-1">Usa los controles de navegación para cambiar de fecha</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bottom bar móvil: navegación + leyenda - Mobile First */}
        {isMobile && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 z-40">
            <div className="w-full flex items-center justify-between">
              {/* Placeholder para centrar grupo central */}
              <div className="invisible">
                <Button variant="outline" size="sm" className="gap-1">
                  <Info className="h-3 w-3" />
                  Leyenda
                </Button>
              </div>
              <div className="flex items-center gap-2 mx-auto">
                <Button variant="outline" size="sm" onClick={()=>go(-1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-sm">Ir a fecha</DialogTitle>
                    </DialogHeader>
                    <DatePicker value={fechaStr} onChange={(v)=> v && goTo(v)} />
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={()=>goTo(toYmd(new Date()))} className="text-xs">Hoy</Button>
                <Button variant="outline" size="sm" onClick={()=>go(1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Info className="h-3 w-3" />
                    Leyenda
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm">Leyenda de estados</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 text-xs rounded ring-1 bg-amber-500/10 text-amber-400 ring-amber-500/20">plan</span> Planificado</span>
                    <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 text-xs rounded ring-1 bg-gray-500/10 text-gray-400 ring-gray-500/20">libre</span> Libre</span>
                    <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 text-xs rounded ring-1 bg-emerald-500/10 text-emerald-400 ring-emerald-500/20">Asistió</span> Asistió</span>
                    <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 text-xs rounded ring-1 bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20">Turno Extra</span> Turno Extra</span>
                    <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 text-xs rounded ring-1 bg-rose-500/10 text-rose-400 ring-rose-500/20">Sin Cobertura</span> Sin Cobertura</span>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </>
    </TooltipProvider>
  );
}