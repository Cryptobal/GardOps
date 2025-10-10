"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
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
import { ChevronLeft, ChevronRight, Calendar, Eye, EyeOff, AlertTriangle, MoreHorizontal, ChevronDown, ChevronUp, Users, X, Zap, Info, MessageSquare, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { PautaRow, PautaDiariaV2Props } from './types';
import { toYmd, toDisplay } from '@/lib/date';
import { GuardiaSearchModal } from '@/components/ui/guardia-search-modal';
import { ComentarioModal } from '@/components/ui/comentario-modal';
import { HorasExtrasModal } from '@/components/ui/horas-extras-modal';
import { useChileDate } from '@/hooks/useChileDate';
import { mapearAEstadoUI, EstadoTurno } from '@/lib/estados-turnos';
import * as api from './apiAdapter';

type Filtros = {
  instalacion?: string;
  estado?: string;
  ppc?: boolean | 'all';
  q?: string;
  turno?: string; // 'dia', 'noche', 'todos'
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

// Helper para limpiar nombres que vienen con formato incorrecto
const limpiarNombreGuardia = (nombre: string | null | undefined): string => {
  if (!nombre || nombre.trim() === '' || nombre === 'null' || nombre === 'undefined') return '—';
  
  const nombreTrimmed = nombre.trim();
  
  // Caso específico: solo coma o espacios con coma (formato malformado)
  if (nombreTrimmed === ',' || nombreTrimmed === ' ,' || nombreTrimmed === ', ' || nombreTrimmed === ' , ') {
    return '—';
  }
  
  // Si tiene formato "Apellido1 Apellido2, Nombre" -> convertir a "Nombre Apellido1"
  if (nombreTrimmed.includes(',')) {
    const partes = nombreTrimmed.split(',');
    if (partes.length === 2) {
      const apellidos = partes[0].trim();
      const nombreParte = partes[1].trim();
      
      // Si alguna parte está vacía, mostrar guión
      if (!apellidos || !nombreParte) {
        return '—';
      }
      
      const primerApellido = apellidos.split(' ')[0];
      return `${nombreParte} ${primerApellido}`;
    }
  }
  
  // Si solo tiene una coma al final (formato malformado)
  if (nombreTrimmed.endsWith(',')) {
    const sinComa = nombreTrimmed.slice(0, -1).trim();
    return sinComa || '—';
  }
  
  return nombreTrimmed || '—';
};

  // Helper para obtener el nombre correcto del guardia
  const obtenerNombreCorrecto = (row: PautaRow): string => {
    const nombreTitular = row.guardia_titular_nombre;
    const nombreTrabajo = row.guardia_trabajo_nombre;
    
    // Priorizar nombre de trabajo (guardia asignado) sobre nombre titular
    // Si hay guardia de trabajo asignado, usar ese nombre
    if (nombreTrabajo && nombreTrabajo.trim() && nombreTrabajo !== 'null' && nombreTrabajo !== 'undefined') {
      return limpiarNombreGuardia(nombreTrabajo);
    }
    
    // Si no hay guardia de trabajo, usar nombre titular
    if (nombreTitular && nombreTitular.trim() && nombreTitular !== 'null' && nombreTitular !== 'undefined') {
      return limpiarNombreGuardia(nombreTitular);
    }
    
    // Si no hay ningún nombre válido, mostrar guión
    return '—';
  };

  // Helper para obtener el nombre del guardia de cobertura
  const obtenerNombreCobertura = (row: PautaRow): string | null => {
    // La API ahora incluye cobertura_guardia_nombre calculado correctamente
    return row.cobertura_guardia_nombre || row.reemplazo_guardia_nombre || null;
  };


// Helpers para estados usando estado_ui
const isAsistido = (estadoUI: string) => {
  return estadoUI === 'asistido' || estadoUI === 'reemplazo' || estadoUI === 'te';
};
const isPlan = (estadoUI: string) => estadoUI === 'plan';
const isSinCobertura = (estadoUI: string) => estadoUI === 'sin_cobertura';
const isLibre = (estadoUI: string) => estadoUI === 'libre';

// Función para formatear el ID del puesto
const formatearPuestoId = (puestoId: string, puestoNombre?: string) => {
  if (puestoNombre) {
    return puestoNombre;
  }
  // Mostrar 4 primeros + 4 últimos dígitos del UUID
  if (puestoId && puestoId.length >= 8) {
    return `${puestoId.slice(0, 4)}…${puestoId.slice(-4)}`;
  }
  return puestoId;
};

const renderEstado = (row: PautaRow) => {
  // NUEVA LÓGICA: Usar estructura de estados si está disponible
  const camposNuevosDisponibles = row.tipo_turno || row.estado_puesto || row.tipo_cobertura;
  
  
  if (camposNuevosDisponibles) {
    const estadoTurno: EstadoTurno = {
      tipo_turno: row.tipo_turno || 'planificado',
      estado_puesto: row.estado_puesto || null,
      estado_guardia: row.estado_guardia === 'null' ? null : row.estado_guardia || null,
      tipo_cobertura: row.tipo_cobertura || null,
      guardia_trabajo_id: row.guardia_trabajo_id || null
    };
    
    const estadoUI = mapearAEstadoUI(estadoTurno);
    
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ring-1 ${estadoUI.color}`}>
        {estadoUI.icono} {estadoUI.descripcion}
      </span>
    );
  }
  
  // LÓGICA LEGACY: Para compatibilidad con datos existentes
  const estadoUI = row.estado_ui || '';
  const hasCobertura = Boolean(row.guardia_trabajo_id && row.guardia_trabajo_id !== row.guardia_titular_id);
  
  
  // Estados consistentes entre pauta mensual y diaria
  const cls: Record<string,string> = {
    asistio:        'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    turno_extra:    'bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20',
    sin_cobertura:  'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    libre:          'bg-gray-500/10 text-gray-400 ring-gray-500/20',
    planificado:    'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    // Estados legacy para compatibilidad
    asistido:       'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    reemplazo:      'bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20',
    inasistencia:   'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    plan:           'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    ppc_libre:      'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    te:             'bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20',
    extra:          'bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20',
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
      case 'extra':
        return 'turno_extra';
      case 'sin_cobertura':
      case 'inasistencia':
        return 'sin_cobertura';
      case 'libre':
        return 'libre';
      case 'plan':
      case 'planificado':
        return 'planificado';
      default:
        return estadoUI;
    }
  })();
  
  const base = cls[estadoNormalizado] ?? 'bg-gray-500/10 text-gray-400 ring-gray-500/20';
  
  // Determinar label
  let label = '';
  if (estadoUI === 'extra' || estadoNormalizado === 'turno_extra' || (hasCobertura && !['asistio', 'asistido', 'sin_cobertura', 'inasistencia', 'plan', 'libre', 'planificado'].includes(estadoUI))) {
    label = 'Turno Extra';
  } else if (estadoNormalizado === 'asistio') {
    label = 'Asistió';
  } else if (estadoNormalizado === 'sin_cobertura') {
    label = 'Sin Cobertura';
  } else if (estadoNormalizado === 'libre') {
    label = 'Libre';
  } else if (estadoNormalizado === 'planificado') {
    label = 'Planificado';
  } else {
    label = estadoUI || 'Sin estado';
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ring-1 ${base}`}>
      {label}
    </span>
  );
};

export default function ClientTable({ rows: rawRows, fecha, incluirLibres = false, onRecargarDatos, activeTab = 'pauta' }: PautaDiariaV2Props) {
  
  // FORCE DEPLOYMENT - DEBUG PPC
  logger.debug('🚀🚀🚀 PAUTA DIARIA V2 LOADED 🚀🚀🚀');
  devLogger.process('🔍 ClientTable se está ejecutando - TEST BOTON debería estar visible');
  
  // Hook para obtener fecha actual respetando configuración del tenant
  const { fechaHoy } = useChileDate();
  
  if (rawRows && rawRows.length > 0) {
    const ppcs = rawRows.filter(row => row.es_ppc === true);
    logger.debug('🎯 PPCs encontrados:', ppcs.length);
    ppcs.forEach(ppc => {
      logger.debug(`PPC: ${ppc.instalacion_nombre} - ${ppc.puesto_nombre} - Estado: ${ppc.estado_ui}`);
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
  
  // Estado para el modal de selección de guardias
  const [showGuardiaModal, setShowGuardiaModal] = useState(false);
  const [currentRowForModal, setCurrentRowForModal] = useState<PautaRow | null>(null);
  
  const [showComentarioModal, setShowComentarioModal] = useState(false);
  const [currentComentarioData, setCurrentComentarioData] = useState<{
    turnoId: string;
    fecha: string;
    comentarioActual?: string;
    puestoNombre?: string;
    guardiaNombre?: string;
  } | null>(null);
  
  const [showHorasExtrasModal, setShowHorasExtrasModal] = useState(false);
  const [currentHorasExtrasData, setCurrentHorasExtrasData] = useState<{
    pautaId: string;
    guardiaNombre?: string;
    instalacionNombre?: string;
    rolNombre?: string;
    montoActual?: number;
    puestoNombre?: string;
  } | null>(null);
  
  const [f, setF] = useState<Filtros>(() => ({ 
    ppc: 'all',
    instalacion: searchParams.get('instalacion') || undefined,
    estado: searchParams.get('estado') || 'todos',
    q: searchParams.get('q') || undefined,
    turno: searchParams.get('turno') || 'todos' // Nuevo filtro para día/noche
  }));
  const [filtersOpen, setFiltersOpen] = useState(false); // Mobile first: filtros cerrados por defecto
  
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

  // Escuchar eventos de recarga desde el buscador GSS
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handlePautaReload = (event: CustomEvent) => {
      devLogger.process('🔄 Evento pauta-diaria-reload recibido en ClientTable:', event.detail);
      devLogger.debug('🔄 Recarga solicitada desde buscador GSS:', event.detail);
      
      // Solo UNA recarga cuando se recibe el evento
      refetch();
    };

    // LocalStorage fallback REMOVIDO - era molesto
    
    devLogger.process('🎧 ClientTable: Registrando listener para pauta-diaria-reload');
    devLogger.process('🎧 ClientTable: URL actual:', window.location.href);
    
    // Registrar listener de eventos
    window.addEventListener('pauta-diaria-reload', handlePautaReload as EventListener);
    
    // LocalStorage polling REMOVIDO - era molesto para el usuario
    
    return () => {
      devLogger.process('🎧 ClientTable: Removiendo listener para pauta-diaria-reload');
      window.removeEventListener('pauta-diaria-reload', handlePautaReload as EventListener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ FIX: Solo ejecutar una vez al montar, refetch siempre tendrá la referencia actualizada por closure

  // Recarga automática REMOVIDA - era molesta para el usuario

  // Recarga por visibilidad REMOVIDA - era molesta para el usuario

  // Persistir filtros en URL (excepto mostrarLibres)
  useEffect(() => {
    const params = new URLSearchParams();
    if (f.instalacion) params.set('instalacion', f.instalacion);
    if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
    if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
    if (f.q) params.set('q', f.q);
    if (f.turno && f.turno !== 'todos') params.set('turno', f.turno);
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
      logger.error('Error cargando guardias disponibles::', err);
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

  // Función para abrir modal de selección de guardias
  const openGuardiaModal = useCallback((row: PautaRow) => {
    devLogger.search(' openGuardiaModal llamado con:', {
      pauta_id: row.pauta_id,
      instalacion_nombre: row.instalacion_nombre,
      rol_nombre: row.rol_nombre,
      guardia_trabajo_id: row.guardia_trabajo_id
    });
    setCurrentRowForModal(row);
    setShowGuardiaModal(true);
    // Cargar guardias disponibles
    loadGuardias(row);
  }, [loadGuardias]);

  // Función para cerrar modal de selección de guardias
  const closeGuardiaModal = useCallback(() => {
    setShowGuardiaModal(false);
    setCurrentRowForModal(null);
  }, []);

  // Función para abrir modal de comentarios
  const openComentarioModal = useCallback((row: PautaRow) => {
    setCurrentComentarioData({
      turnoId: row.pauta_id,
      fecha: fechaStr,
      comentarioActual: row.comentarios || undefined,
      puestoNombre: row.puesto_nombre,
      guardiaNombre: limpiarNombreGuardia(row.guardia_trabajo_nombre)
    });
    setShowComentarioModal(true);
  }, [fechaStr]);

  // Función para cerrar modal de comentarios
  const closeComentarioModal = useCallback(() => {
    setShowComentarioModal(false);
    setCurrentComentarioData(null);
  }, []);

  // Función para manejar cuando se guarda un comentario
  const handleComentarioSaved = useCallback((comentario: string | null) => {
    devLogger.process('🔍 handleComentarioSaved ejecutado. Comentario guardado:', comentario);
    // Actualizar los datos después de guardar el comentario
    if (onRecargarDatos) {
      devLogger.process('🔄 Recargando datos después de comentario...');
      onRecargarDatos();
    }
  }, [onRecargarDatos]);

  // Función para abrir modal de horas extras
  const openHorasExtrasModal = useCallback((row: PautaRow) => {
    setCurrentHorasExtrasData({
      pautaId: row.pauta_id,
      guardiaNombre: row.guardia_trabajo_nombre || row.guardia_titular_nombre,
      instalacionNombre: row.instalacion_nombre,
      rolNombre: row.rol_nombre,
      montoActual: row.horas_extras || 0,
      puestoNombre: row.puesto_nombre
    });
    setShowHorasExtrasModal(true);
  }, []);

  // Función para cerrar modal de horas extras
  const closeHorasExtrasModal = useCallback(() => {
    setShowHorasExtrasModal(false);
    setCurrentHorasExtrasData(null);
  }, []);

  // Función para manejar cuando se guardan horas extras
  const handleHorasExtrasSaved = useCallback((monto: number) => {
    devLogger.process('🔍 handleHorasExtrasSaved ejecutado. Monto guardado:', monto);
    // Actualizar los datos después de guardar las horas extras
    if (onRecargarDatos) {
      onRecargarDatos();
    }
  }, [onRecargarDatos]);

  // Función para manejar selección de guardia desde el modal
  const handleGuardiaSelected = useCallback((guardiaId: string) => {
    devLogger.search(' handleGuardiaSelected llamado con:', {
      guardiaId,
      currentRowForModal: currentRowForModal?.pauta_id
    });
    if (currentRowForModal) {
      setRowPanelData(prev => ({
        ...prev,
        [currentRowForModal.pauta_id]: {
          ...prev[currentRowForModal.pauta_id],
          guardiaReemplazo: guardiaId
        }
      }));
      closeGuardiaModal();
    }
  }, [currentRowForModal, closeGuardiaModal]);

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
    devLogger.process(' onCubrirPPC ejecutado:', row.pauta_id);
    const panelData = rowPanelData[row.pauta_id];
    if (!panelData?.guardiaReemplazo) {
      logger.debug('❌ No hay guardiaReemplazo:', panelData);
      return;
    }
    devLogger.success(' Guardia para asignar:', panelData.guardiaReemplazo);

    // Validar que el guardia de cobertura no esté asignado a otro turno
    try {
      devLogger.search(' Validando guardia:', {
        guardia_id: panelData.guardiaReemplazo,
        fecha: row.fecha,
        pauta_id: row.pauta_id
      });
      validarGuardiaDisponible(panelData.guardiaReemplazo, row.fecha, row.pauta_id);
      logger.debug('✅ Validación exitosa');
    } catch (error: any) {
      logger.debug('❌ Error en validación:', error.message);
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
      devLogger.search(' Llamando marcarTurnoExtra con:', {
        pauta_id: row.pauta_id,
        guardia_id: panelData.guardiaReemplazo,
        row: row
      });
      
      const result = await api.marcarTurnoExtra(
        row.pauta_id,
        panelData.guardiaReemplazo,
        row // Pasar la fila completa con fecha, instalacion_id, rol_id, puesto_id
      );
      
      devLogger.success(' Resultado de marcarTurnoExtra:', result);
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
    devLogger.process('🔍 [onSinCoberturaPPC] Iniciando función con pauta_id:', pauta_id);
    try {
      setSavingId(pauta_id);
      devLogger.process('🔍 [onSinCoberturaPPC] Llamando a api.marcarSinCoberturaPPC...');
      const result = await api.marcarSinCoberturaPPC(pauta_id);
      devLogger.process('🔍 [onSinCoberturaPPC] Resultado de la API:', result);
      
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
      console.error('❌ [onSinCoberturaPPC] Error:', e);
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
    devLogger.process(' Iniciando deshacer para pauta_id:', pauta_id);
    try {
      setSavingId(pauta_id);
      const result = await api.deshacerMarcado(pauta_id);
      devLogger.success(' Resultado de deshacer:', result);
      
      // Verificar si el resultado es exitoso
      if (result && (result.success === true || result.ok === true)) {
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
        logger.debug('🔄 Actualizando datos sin recarga...');
        
        if (onRecargarDatos) {
          await onRecargarDatos();
        }
        
        // Limpiar el estado de saving
        setSavingId(null);
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

  // NUEVA LÓGICA: Usar campos nuevos para determinar visibilidad de botones
  const isTitularPlan = (r: PautaRow) => {
    // Si hay guardia asignado (titular o de trabajo), mostrar botones de asistencia
    const tieneGuardiaAsignado = (r.guardia_titular_nombre && r.guardia_titular_nombre.trim()) || (r.guardia_trabajo_nombre && r.guardia_trabajo_nombre.trim());
    
    if (tieneGuardiaAsignado) {
      // CORREGIDO: Verificar que el estado_puesto sea realmente 'asignado', no solo que no sea 'libre'
      return r.tipo_turno === 'planificado' && r.estado_puesto === 'asignado';
    }
    
    // Usar campos nuevos si están disponibles
    if (r.tipo_turno && r.estado_puesto) {
      return r.estado_puesto === 'asignado' && r.tipo_turno === 'planificado' && 
             (r.estado_guardia === 'asistido' || r.estado_guardia === null || r.estado_guardia === 'null');
    }
    // Fallback a lógica legacy
    return r.es_ppc === false && (r.estado_ui === 'plan' || r.estado_ui === 'planificado') && 
           r.estado_pauta_mensual !== 'libre' && r.tipo_turno !== 'libre';
  };
  
  const isPpcPlan = (r: PautaRow) => {
    // NO mostrar botones de PPC si hay guardia asignado
    const tieneGuardiaAsignado = (r.guardia_titular_nombre && r.guardia_titular_nombre.trim()) || (r.guardia_trabajo_nombre && r.guardia_trabajo_nombre.trim());
    if (tieneGuardiaAsignado) {
      return false;
    }
    
    // Usar campos nuevos si están disponibles
    if (r.tipo_turno && r.estado_puesto) {
      return r.estado_puesto === 'ppc' && r.tipo_turno === 'planificado' && 
             r.tipo_cobertura !== 'turno_extra' && r.tipo_cobertura !== 'sin_cobertura';
    }
    // Fallback a lógica legacy
    return r.es_ppc === true && r.estado_pauta_mensual !== 'libre' && 
           r.tipo_turno !== 'libre' && r.estado_ui !== 'sin_cobertura';
  };
  // PPCs sin cobertura: Solo muestran Cubrir y Deshacer (NO "Sin cobertura")
  const isPpcSinCobertura = (r: PautaRow) => {
    // NO mostrar botones de PPC si hay guardia asignado
    const tieneGuardiaAsignado = (r.guardia_titular_nombre && r.guardia_titular_nombre.trim()) || (r.guardia_trabajo_nombre && r.guardia_trabajo_nombre.trim());
    if (tieneGuardiaAsignado) {
      return false;
    }
    
    // Usar campos nuevos si están disponibles
    if (r.tipo_turno && r.estado_puesto) {
      return r.estado_puesto === 'ppc' && r.tipo_turno === 'planificado' && 
             r.tipo_cobertura === 'sin_cobertura';
    }
    // Fallback a lógica legacy
    return r.es_ppc === true && r.estado_ui === 'sin_cobertura';
  };
  const canUndo = (r: PautaRow) => {
    // NUEVA LÓGICA: Usar estructura de estados si está disponible
    if (r.tipo_turno || r.estado_puesto || r.tipo_cobertura) {
      const estadoTurno: EstadoTurno = {
        tipo_turno: r.tipo_turno || 'planificado',
        estado_puesto: r.estado_puesto || null,
        estado_guardia: r.estado_guardia === 'null' ? null : r.estado_guardia || null,
        tipo_cobertura: r.tipo_cobertura || null,
        guardia_trabajo_id: r.guardia_trabajo_id || null
      };
      
      const estadoUI = mapearAEstadoUI(estadoTurno);
      const canUndoResult = ['asistido', 'turno_extra', 'sin_cobertura'].includes(estadoUI.estado);
      
      devLogger.process('🔍 Debug canUndo nueva lógica:', {
        pauta_id: r.pauta_id,
        estadoTurno,
        estadoUI,
        canUndoResult,
        allowedStates: ['asistido', 'turno_extra', 'sin_cobertura'],
        estadoIncluido: ['asistido', 'turno_extra', 'sin_cobertura'].includes(estadoUI.estado)
      });
      
      return canUndoResult;
    }
    
    // LÓGICA LEGACY: Para compatibilidad con datos existentes
    const canUndoResult = [
      'asistido', 'asistio',           // Estados de asistencia
      'reemplazo', 'turno_extra', 'te', // Estados de reemplazo/turno extra
      'sin_cobertura', 'inasistencia',  // Estados de falta/sin cobertura
      'extra'                          // Estado de PPC cubierto (cobertura extra)
    ].includes(r.estado_ui);
    
    // Para PPC sin cobertura, siempre permitir deshacer
    if (r.es_ppc && r.estado_ui === 'sin_cobertura') {
      devLogger.search(' Debug canUndo PPC sin cobertura:', {
        pauta_id: r.pauta_id,
        estado_ui: r.estado_ui,
        es_ppc: r.es_ppc,
        guardia_trabajo_id: r.guardia_trabajo_id,
        canUndoResult: true
      });
      return true;
    }
    
    // Para turnos extras (estado 'extra'), siempre permitir deshacer si tienen cobertura
    if (r.estado_ui === 'extra' && r.guardia_trabajo_id) {
      devLogger.search(' Debug canUndo turno extra:', {
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
      devLogger.search(' Debug canUndo legacy:', {
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
    const filteredRows = (rows ?? []).filter((r:any) => {
      // Filtrar filas con estado === 'libre' cuando mostrarLibres === false
      // PERO SIEMPRE mostrar turnos "extra" (Turno Extra morado) y PPCs (planificados o marcados)
      if (!mostrarLibres && (
        r.estado_pauta_mensual === 'libre' || 
        r.estado_ui === 'libre' || 
        r.tipo_turno === 'libre' ||
        (r.estado_pauta_mensual === null && !r.es_ppc)
      )) return false;

      if (f.instalacion && `${r.instalacion_id}` !== f.instalacion && r.instalacion_nombre !== f.instalacion) return false;
      if (f.estado && f.estado !== 'todos') {
        // Usar estado directamente para filtrar
        if (r.estado !== f.estado) return false;
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
      
      // Filtrar por turno (día/noche)
      if (f.turno && f.turno !== 'todos') {
        const horaInicio = r.hora_inicio;
        if (horaInicio) {
          const hora = parseInt(horaInicio.split(':')[0]);
          if (f.turno === 'dia' && hora >= 12) return false; // Turno de día: antes de las 12:00
          if (f.turno === 'noche' && hora < 12) return false; // Turno de noche: después de las 12:00
        }
      }
      
      return true;
    });

    // Ordenar por horario de ingreso y luego por nombre de instalación alfabéticamente
    return filteredRows.sort((a: any, b: any) => {
      // 1. Priorizar por horario de ingreso
      const horaA = a.hora_inicio ? parseInt(a.hora_inicio.split(':')[0]) : 0;
      const horaB = b.hora_inicio ? parseInt(b.hora_inicio.split(':')[0]) : 0;
      
      if (horaA !== horaB) {
        return horaA - horaB;
      }
      
      // 2. Si tienen la misma hora, ordenar por nombre de instalación alfabéticamente
      const nombreA = (a.instalacion_nombre || '').toLowerCase();
      const nombreB = (b.instalacion_nombre || '').toLowerCase();
      
      return nombreA.localeCompare(nombreB);
    });
  }, [rows, f.instalacion, f.estado, f.ppc, f.q, f.turno, mostrarLibres]);

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
                      
                      {/* Botón para abrir modal de selección */}
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => openGuardiaModal(row)}
                        disabled={panelData.loadingGuardias}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {panelData.guardiaReemplazo ? (
                          <span>
                            {panelData.guardias?.find(g => g.id === panelData.guardiaReemplazo)?.nombre_completo || 'Guardia seleccionado'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Seleccionar guardia</span>
                        )}
                      </Button>
                      
                      {panelData.guardiaReemplazo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePanelData({ guardiaReemplazo: '' })}
                          className="w-full text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Limpiar selección
                        </Button>
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
                    
                    {/* Botón para abrir modal de selección */}
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => openGuardiaModal(row)}
                      disabled={panelData.loadingGuardias}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {panelData.guardiaReemplazo ? (
                        <span>
                          {panelData.guardias?.find(g => g.id === panelData.guardiaReemplazo)?.nombre_completo || 'Guardia seleccionado'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Seleccionar guardia</span>
                      )}
                    </Button>
                    
                    {panelData.guardiaReemplazo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updatePanelData({ guardiaReemplazo: '' })}
                        className="w-full text-red-600 hover:text-red-700"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Limpiar selección
                      </Button>
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
                        logger.debug('🖱️ CONFIRMAR CLICKED:', panelData.guardiaReemplazo);
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
                  {/* Si se puede deshacer, SOLO mostrar el botón deshacer */}
                  {canUndo(row) && canMarkOverride ? (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="w-full"
                      disabled={isLoading} 
                      onClick={() => onDeshacer(row.pauta_id)}
                    >
                      {isLoading ? 'Guardando...' : '↩️ Deshacer'}
                    </Button>
                  ) : (
                    <>
                      {/* Botones iniciales solo si NO se puede deshacer */}
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
                              logger.debug('🖱️ CUBRIR CLICKED - PPC ID:', row.pauta_id);
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
                    </>
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
      devLogger.critical(' PPC BLOQUEADO POR savingId:', {
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
      <Card className={`${esDuplicado ? 'border-yellow-300' : ''} shadow-sm hover:shadow-md transition-shadow duration-200`}>
        <CardContent className="p-3 space-y-2">
          {/* Header compacto con información esencial */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {row.rol_alias || row.rol_nombre?.split('/')[0]?.trim() || '—'}
                </div>
                {esDuplicado && (
                  <Badge variant="destructive" className="text-xs px-1 py-0">Dup</Badge>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {row.instalacion_nombre} • {row.puesto_nombre || 'Sin nombre'}
              </div>
              {row.hora_inicio && row.hora_fin && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {row.hora_inicio.slice(0,5)} - {row.hora_fin.slice(0,5)}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 ml-2">
              {renderEstado(row)}
            </div>
          </div>

          {/* Información del guardia compacta */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {esPPC ? '🔄 PPC' : obtenerNombreCorrecto(row)}
              </div>
              {row.estado_ui === 'te' && (row.cobertura_guardia_nombre || row.meta?.cobertura_guardia_id) && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Cobertura: {row.cobertura_guardia_nombre || 'Guardia de cobertura'}
                </div>
              )}
            </div>
            {/* Indicadores compactos */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {row.comentarios && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" title="Comentario disponible"></div>
              )}
              {row.horas_extras && row.horas_extras > 0 && (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Horas extras"></div>
              )}
            </div>
          </div>

          {/* Botones de acción compactos */}
          <div className="space-y-2">
            {/* Botones principales */}
            {canUndo(row) ? (
              <Button size="sm" variant="secondary" disabled={isLoading} className="w-full h-8 text-xs" onClick={() => onDeshacer(row.pauta_id)}>
                ↩️ Deshacer
              </Button>
            ) : (
              <div className="flex gap-1">
                {isTitularPlan(row) && (
                  <>
                    <Button size="sm" disabled={isLoading} onClick={() => onAsistio(row.pauta_id)} className="flex-1 h-8 text-xs">
                      ✅ Asistió
                    </Button>
                    <Button size="sm" variant="outline" disabled={isLoading} className="flex-1 h-8 text-xs" onClick={() => toggleRowPanel(row, 'no_asistio')}>
                      ❌ No asistió
                    </Button>
                  </>
                )}
                {isPpcPlan(row) && (
                  <>
                    <Button size="sm" variant="outline" disabled={isLoading} className="flex-1 h-8 text-xs" onClick={() => { toggleRowPanel(row, 'cubrir_ppc'); setTimeout(()=>loadGuardias(row),0); }}>
                      👥 Cubrir
                    </Button>
                    <Button size="sm" variant="outline" disabled={isLoading} className="flex-1 h-8 text-xs" onClick={() => onSinCoberturaPPC(row.pauta_id)}>
                      ⛔ Sin cobertura
                    </Button>
                  </>
                )}
                {isPpcSinCobertura(row) && (
                  <Button size="sm" variant="outline" disabled={isLoading} className="w-full h-8 text-xs" onClick={() => { toggleRowPanel(row, 'cubrir_ppc'); setTimeout(()=>loadGuardias(row),0); }}>
                    👥 Cubrir
                  </Button>
                )}
              </div>
            )}
            
            {/* Botones secundarios compactos */}
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                disabled={isLoading} 
                className={`flex-1 h-7 text-xs ${
                  row.comentarios 
                    ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' 
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                }`}
                onClick={() => openComentarioModal(row)}
              >
                💬 {row.comentarios ? 'Editar' : 'Comentario'}
              </Button>
              
              {row.guardia_trabajo_id && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={isLoading} 
                  className={`flex-1 h-7 text-xs ${
                    row.horas_extras && row.horas_extras > 0
                      ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  }`}
                  onClick={() => openHorasExtrasModal(row)}
                >
                  💰 {row.horas_extras && row.horas_extras > 0 ? 'Editar' : 'Horas'}
                </Button>
              )}
            </div>
          </div>

          {/* Botones de contacto compactos */}
          {(row.guardia_trabajo_telefono || row.cobertura_guardia_telefono || row.guardia_titular_telefono) && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => {
                  const telefono = row.guardia_trabajo_telefono || row.cobertura_guardia_telefono || row.guardia_titular_telefono;
                  if (telefono) {
                    llamarTelefono(telefono);
                  }
                }}
              >
                📞 Llamar
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
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
                      
                      {/* Botón para abrir modal de selección */}
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => openGuardiaModal(row)}
                        disabled={panelData.loadingGuardias}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {panelData.guardiaReemplazo ? (
                          <span>
                            {panelData.guardias?.find(g => g.id === panelData.guardiaReemplazo)?.nombre_completo || 'Guardia seleccionado'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Seleccionar guardia</span>
                        )}
                      </Button>
                      
                      {panelData.guardiaReemplazo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePanelData({ guardiaReemplazo: '' })}
                          className="w-full text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Limpiar selección
                        </Button>
                      )}
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
                    
                    {/* Botón para abrir modal de selección */}
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => openGuardiaModal(row)}
                      disabled={panelData.loadingGuardias}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {panelData.guardiaReemplazo ? (
                        <span>
                          {panelData.guardias?.find(g => g.id === panelData.guardiaReemplazo)?.nombre_completo || 'Guardia seleccionado'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Seleccionar guardia</span>
                      )}
                    </Button>
                    
                    {panelData.guardiaReemplazo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updatePanelData({ guardiaReemplazo: '' })}
                        className="w-full text-red-600 hover:text-red-700"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Limpiar selección
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={()=>toggleRowPanel(row)} disabled={isLoading}>Cancelar</Button>
                    <Button size="sm" onClick={()=>{
                      logger.debug('📱 MOBILE CONFIRMAR:', panelData.guardiaReemplazo);
                      devLogger.critical(' Estado antes de confirmar:', { savingId, isLoading, pauta_id: row.pauta_id });
                      if (isLoading) {
                        logger.debug('🚨 FORZANDO LIMPIEZA DE savingId');
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
      logger.error('Error guardando estado del semáforo::', error);
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
      logger.error('Error guardando comentario::', error);
      addToast({
        title: "❌ Error",
        description: "No se pudo guardar el comentario",
        type: "error"
      });
    }
  }, [addToast]);

  return (
    <TooltipProvider>
      <div className={`w-full ${isMobile ? 'pb-20' : ''}`}>
        {/* Header fecha + nav - Mobile First Responsive */}
        <Card className={`mb-4 w-full bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg ${isMobile ? 'sticky top-0 z-20' : ''}`}>
          <CardContent className="p-3 md:p-4">
            {/* Layout responsive: vertical en móvil, horizontal en desktop */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              
              {/* Navegación de fechas - Mobile First */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                
                
                {/* Controles de navegación - Optimizados para móvil */}
                <div className="flex items-center justify-center gap-2 md:gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={()=>go(-1)}
                    className="h-9 w-9 md:h-10 md:w-10 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Input de fecha compacto para móvil */}
                  <div className="flex items-stretch gap-1">
                    <Input
                      ref={inputRef}
                      type="date"
                      className="w-32 md:w-auto text-sm font-medium border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400"
                      value={fechaStr}
                      onChange={(e) => {
                        const params = new URLSearchParams();
                        if (f.instalacion) params.set('instalacion', f.instalacion);
                        if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
                        if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
                        if (f.q) params.set('q', f.q);
                        if (mostrarLibres) params.set('incluirLibres', 'true');
                        
                        const newUrl = `/pauta-diaria?fecha=${e.target.value}${params.toString() ? '&' + params.toString() : ''}`;
                        router.push(newUrl);
                      }}
                    />
                    <Button
                      aria-label="Abrir calendario"
                      variant="outline"
                      size="sm"
                      onClick={()=>inputRef.current?.showPicker?.()}
                      className="h-9 md:h-10 px-2 md:px-3 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Botón Hoy compacto para móvil */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const hoy = fechaHoy || toYmd(new Date());
                      const params = new URLSearchParams();
                      if (f.instalacion) params.set('instalacion', f.instalacion);
                      if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
                      if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
                      if (f.q) params.set('q', f.q);
                      if (mostrarLibres) params.set('incluirLibres', 'true');
                      
                      const newUrl = `/pauta-diaria?fecha=${hoy}${params.toString() ? '&' + params.toString() : ''}`;
                      router.push(newUrl);
                    }}
                    className="h-9 md:h-10 px-2 md:px-4 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 font-semibold text-xs md:text-sm"
                  >
                    <span className="hidden sm:inline">📅 Hoy</span>
                    <span className="sm:hidden">Hoy</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={()=>go(1)}
                    className="h-9 w-9 md:h-10 md:w-10 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Controles responsive - Ocultos en móvil, visibles en desktop */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    {mostrarLibres ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-500" />}
                    <Label htmlFor="incluir-libres" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Incluir turnos libres
                    </Label>
                  </div>
                  <Switch
                    id="incluir-libres"
                    checked={mostrarLibres}
                    onCheckedChange={setMostrarLibres}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
                
                {/* Estadísticas rápidas */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">{filtered.length} turnos</span>
                </div>
              </div>
              
              {/* Controles móviles compactos */}
              <div className="md:hidden flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">{filtered.length} turnos</span>
                </div>
                
                {/* Switch compacto para móvil */}
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    {mostrarLibres ? <Eye className="h-3 w-3 text-green-600" /> : <EyeOff className="h-3 w-3 text-gray-500" />}
                    <Label htmlFor="incluir-libres-mobile" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Libres
                    </Label>
                  </div>
                  <Switch
                    id="incluir-libres-mobile"
                    checked={mostrarLibres}
                    onCheckedChange={setMostrarLibres}
                    className="data-[state=checked]:bg-blue-600 scale-75"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botón de filtros fijo en móvil - Mobile First */}
        {isMobile && (
          <div className="mb-3 sticky top-16 z-10 bg-white dark:bg-gray-900 py-2">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={()=>setFiltersOpen(o=>!o)} 
                className="text-xs h-8 px-3 flex-1 mr-2"
              >
                🔍 {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
              </Button>
              {filtersOpen && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setF({})} 
                  className="text-xs h-8 px-2 text-gray-500"
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Controles de filtro - Mobile First Minimalista */}
        {isMobile ? (
          <div className="mb-2">
            
            {/* Filtros expandibles para móvil */}
            {filtersOpen && (
              <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                {/* Botones de filtro día/noche */}
                <div className="flex gap-2 mb-3">
                  <Button 
                    variant={f.turno === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'todos'})}
                    className="flex-1 text-xs h-8"
                  >
                    🌅 Todos
                  </Button>
                  <Button 
                    variant={f.turno === 'dia' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'dia'})}
                    className="flex-1 text-xs h-8"
                  >
                    ☀️ Día
                  </Button>
                  <Button 
                    variant={f.turno === 'noche' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'noche'})}
                    className="flex-1 text-xs h-8"
                  >
                    🌙 Noche
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    placeholder="Filtrar instalación…"
                    value={f.instalacion ?? ''} 
                    onChange={e=>setF(s=>({ ...s, instalacion: e.target.value || undefined }))}
                    className="text-xs h-8"
                  />
                  
                  <Select value={f.estado ?? 'todos'} onValueChange={(value) => setF(s=>({ ...s, estado: value === 'todos' ? undefined : value }))}>
                    <SelectTrigger className="text-xs h-8">
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
                    <SelectTrigger className="text-xs h-8">
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
                    className="text-xs h-8"
                  />
                </div>
                
                {/* Botones de filtro día/noche */}
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant={f.turno === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'todos'})}
                    className="flex-1 text-xs h-8"
                  >
                    🌅 Todos
                  </Button>
                  <Button 
                    variant={f.turno === 'dia' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'dia'})}
                    className="flex-1 text-xs h-8"
                  >
                    ☀️ Día
                  </Button>
                  <Button 
                    variant={f.turno === 'noche' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'noche'})}
                    className="flex-1 text-xs h-8"
                  >
                    🌙 Noche
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="mb-4 w-full bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  🔍 Filtros Avanzados
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setF({ ppc: 'all' })} 
                  className="text-sm h-8 px-3 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                >
                  🗑️ Limpiar Filtros
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Instalación</Label>
                  <Input
                    placeholder="Filtrar instalación…"
                    value={f.instalacion ?? ''} 
                    onChange={e=>setF(s=>({ ...s, instalacion: e.target.value || undefined }))}
                    className="text-sm h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</Label>
                  <Select value={f.estado ?? 'todos'} onValueChange={(value) => setF(s=>({ ...s, estado: value === 'todos' ? undefined : value }))}>
                    <SelectTrigger className="text-sm h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400">
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
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Turno</Label>
                  <Select value={f.ppc === 'all' ? 'all' : f.ppc === true ? 'true' : 'false'} 
                          onValueChange={(value) => {
                            const v = value as 'all'|'true'|'false';
                            setF(s=>({ ...s, ppc: v === 'all' ? 'all' : v === 'true' }));
                          }}>
                    <SelectTrigger className="text-sm h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400">
                      <SelectValue placeholder="PPC (todos)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="true">Solo PPC</SelectItem>
                      <SelectItem value="false">Solo con guardia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Búsqueda</Label>
                  <Input
                    placeholder="Buscar guardia / rol / instalación…"
                    value={f.q ?? ''} 
                    onChange={e=>setF(s=>({ ...s, q: e.target.value || undefined }))}
                    className="text-sm h-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Acciones</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setF({ ppc: 'all' })} 
                      className="text-sm h-10 px-3 flex-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Limpiar
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Botones de filtro día/noche */}
              <div className="mt-4">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Filtrar por Turno</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={f.turno === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'todos'})}
                    className="flex-1 text-sm h-10"
                  >
                    🌅 Todos
                  </Button>
                  <Button 
                    variant={f.turno === 'dia' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'dia'})}
                    className="flex-1 text-sm h-10"
                  >
                    ☀️ Día
                  </Button>
                  <Button 
                    variant={f.turno === 'noche' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setF({...f, turno: 'noche'})}
                    className="flex-1 text-sm h-10"
                  >
                    🌙 Noche
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vista Desktop (tabla) optimizada */}
        {!isMobile ? (
          <Card className="w-full bg-white dark:bg-gray-900 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                    <TableHead className="text-sm font-semibold text-gray-900 dark:text-white py-4 px-4">Instalación</TableHead>
                    <TableHead className="text-sm font-semibold text-gray-900 dark:text-white py-4 px-4">Rol</TableHead>
                    <TableHead className="hidden md:table-cell text-sm font-semibold text-gray-900 dark:text-white py-4 px-4">Puesto</TableHead>
                    <TableHead className="text-sm font-semibold text-gray-900 dark:text-white py-4 px-4">Guardia</TableHead>
                    <TableHead className="text-sm font-semibold text-gray-900 dark:text-white py-4 px-4">Cobertura</TableHead>
                    <TableHead className="text-sm font-semibold text-gray-900 dark:text-white py-4 px-4">Estado</TableHead>
                    <TableHead className="text-sm font-semibold text-gray-900 dark:text-white py-4 px-4">Acciones</TableHead>
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
                        <TableRow className={`${esDuplicado ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'} transition-colors duration-200`}>
                          <TableCell className="text-sm font-medium text-gray-900 dark:text-white py-4 px-4">{r.instalacion_nombre}</TableCell>
                          <TableCell className="py-4 px-4">
                            {r.rol_nombre ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">{r.rol_alias || r.rol_nombre.split('/')[0].trim()}</span>
                                {r.hora_inicio && r.hora_fin && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{r.hora_inicio.slice(0,5)} - {r.hora_fin.slice(0,5)}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-4 px-4">
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col">
                                  <span className="text-sm text-gray-700 dark:text-gray-300 cursor-help">{r.puesto_nombre || 'Sin nombre'}</span>
                                  {r.pauta_id && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      (Turno: {r.pauta_id})
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm space-y-1">
                                  <div><strong>Puesto:</strong> {r.puesto_nombre || 'Sin nombre'}</div>
                                  <div><strong>ID Puesto:</strong> {r.puesto_id}</div>
                                  <div><strong>ID Turno:</strong> {r.pauta_id}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              {r.es_ppc ? (
                                <span className="rounded-md border px-2 py-1 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20 font-semibold">🔄 PPC</span>
                              ) : (
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">{obtenerNombreCorrecto(r)}</span>
                              )}
                              {esDuplicado && (
                                <Badge variant="destructive" className="text-xs w-fit"><AlertTriangle className="h-3 w-3 mr-1"/>Duplicado</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            {(() => {
                              const nombreCobertura = obtenerNombreCobertura(r);
                              return nombreCobertura ? (
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-sm text-gray-900 dark:text-white">{nombreCobertura}</span>
                                  {r.meta?.motivo && (<span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{r.meta.motivo}</span>)}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            <div>{renderEstado(r)}</div>
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            {(() => {
                              const isTitular = isTitularPlan(r);
                              const isPpc = isPpcPlan(r);
                              const isPpcSinCob = isPpcSinCobertura(r);
                              const canUndoResult = canUndo(r);
                              const hasActions = isTitular || isPpc || isPpcSinCob || canUndoResult;
                              const showButton = !loadingPerms && canMarkOverride && hasActions;
                              
                              if (!showButton) return <span className="text-xs text-muted-foreground">—</span>;
                              
                              return (
                                <div className="flex flex-col gap-2">
                                  {/* Si se puede deshacer, SOLO mostrar el botón deshacer */}
                                  {canUndoResult ? (
                                    <Button 
                                      size="sm" 
                                      variant="secondary" 
                                      disabled={isLoading} 
                                      className="h-8 px-3 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700" 
                                      onClick={() => onDeshacer(r.pauta_id)}
                                    >
                                      ↩️ Deshacer
                                    </Button>
                                  ) : (
                                    <>
                                      {/* Botones iniciales solo si NO se puede deshacer */}
                                      {isTitular && (
                                        <div className="flex gap-2">
                                          <Button 
                                            size="sm" 
                                            disabled={isLoading} 
                                            onClick={() => onAsistio(r.pauta_id)} 
                                            className="h-8 px-3 text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                                          >
                                            ✅ Asistió
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            disabled={isLoading} 
                                            className="h-8 px-3 text-sm font-medium border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20" 
                                            onClick={() => toggleRowPanel(r, 'no_asistio')}
                                          >
                                            ❌ No asistió
                                          </Button>
                                        </div>
                                      )}
                                      {isPpc && (
                                        <div className="flex gap-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            disabled={isLoading} 
                                            className="h-8 px-3 text-sm font-medium border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20" 
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
                                            className="h-8 px-3 text-sm font-medium border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20" 
                                            onClick={() => {
                                              devLogger.process('🔍 [Button] Click en Sin cobertura para pauta_id:', r.pauta_id);
                                              onSinCoberturaPPC(r.pauta_id);
                                            }}
                                          >
                                            ⛔ Sin cobertura
                                          </Button>
                                        </div>
                                      )}
                                      {isPpcSinCob && (
                                        <div className="flex gap-2">
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            disabled={isLoading} 
                                            className="h-8 px-3 text-sm font-medium border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20" 
                                            onClick={() => { 
                                              toggleRowPanel(r, 'cubrir_ppc'); 
                                              setTimeout(()=>loadGuardias(r),0); 
                                            }}
                                          >
                                            👥 Cubrir
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Botones secundarios - horas extras y comentarios */}
                                  <div className="flex gap-2">
                                    {/* Botón de horas extras - disponible para turnos con guardia asignado */}
                                    {r.guardia_trabajo_id && (
                                      <div className="relative">
                                        <Tooltip delayDuration={100}>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className={`h-8 px-3 text-sm font-medium ${
                                                r.horas_extras && r.horas_extras > 0
                                                  ? 'text-green-700 bg-green-100 border-green-300 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                                              }`}
                                              onClick={() => {
                                                devLogger.process('🔍 CLICK BOTÓN HORAS EXTRAS DESKTOP para:', r.puesto_nombre, 'monto:', r.horas_extras);
                                                openHorasExtrasModal(r);
                                              }}
                                            >
                                              💰 {r.horas_extras && r.horas_extras > 0 ? 'Editar' : 'Horas'}
                                              {/* Indicador de horas extras */}
                                              {r.horas_extras && r.horas_extras > 0 && (
                                                <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></div>
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent 
                                            side="bottom" 
                                            align="center"
                                            sideOffset={8}
                                            className="z-[60] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-700 dark:border-slate-300 shadow-lg"
                                          >
                                            <div className="text-sm font-medium">
                                              {r.horas_extras && r.horas_extras > 0 
                                                ? `💰 Editar horas extras: $${Math.round(r.horas_extras).toLocaleString('es-CL', {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 0
                                                  })}` 
                                                : '💰 Agregar horas extras'
                                              }
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    )}
                                    
                                    {/* Botón de comentarios - disponible para todos los turnos */}
                                    <div className="relative">
                                      <Tooltip delayDuration={100}>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className={`h-8 px-3 text-sm font-medium ${
                                              r.comentarios 
                                                ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                            }`}
                                            onClick={() => {
                                              devLogger.process('🔍 CLICK BOTÓN COMENTARIO DESKTOP para:', r.puesto_nombre, 'estado:', r.estado_ui);
                                              openComentarioModal(r);
                                            }}
                                          >
                                            💬 {r.comentarios ? 'Editar' : 'Comentario'}
                                            {/* Indicador de que hay comentario */}
                                            {r.comentarios && (
                                              <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></div>
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent 
                                          side="bottom" 
                                          align="center"
                                          sideOffset={8}
                                          className="z-[60] bg-blue-900 dark:bg-blue-100 text-white dark:text-blue-900 border-blue-700 dark:border-blue-300 shadow-lg max-w-xs"
                                        >
                                          <div className="text-sm font-medium">
                                            {r.comentarios 
                                              ? `💬 Editar comentario: ${r.comentarios.length > 50 ? r.comentarios.substring(0, 50) + '...' : r.comentarios}` 
                                              : '💬 Agregar comentario'
                                            }
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
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

        {/* Bottom bar móvil optimizada - Mobile First */}
        {isMobile && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white/95 dark:bg-gray-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 dark:supports-[backdrop-filter]:bg-gray-900/90 p-2 z-40 shadow-lg">
            <div className="w-full flex items-center justify-between">
              {/* Navegación de fechas compacta */}
              <div className="flex items-center gap-1 flex-1 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={()=>go(-1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 px-3 text-xs font-medium"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {toDisplay(fechaStr)}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-sm">Ir a fecha</DialogTitle>
                    </DialogHeader>
                    <DatePicker value={fechaStr} onChange={(v)=> v && goTo(v)} />
                  </DialogContent>
                </Dialog>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={()=>goTo(fechaHoy || toYmd(new Date()))} 
                  className="h-8 px-2 text-xs font-medium"
                >
                  Hoy
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={()=>go(1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Botón de leyenda compacto */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                  >
                    <Info className="h-4 w-4" />
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

        {/* Modal de selección de guardias */}
        {currentRowForModal && (
          <>
            {devLogger.process('🔍 Renderizando GuardiaSearchModal:', {
              isOpen: showGuardiaModal,
              currentRowForModal: currentRowForModal.pauta_id,
              guardias: rowPanelData[currentRowForModal.pauta_id]?.guardias?.length || 0,
              loading: rowPanelData[currentRowForModal.pauta_id]?.loadingGuardias || false
            })}
            <GuardiaSearchModal
              isOpen={showGuardiaModal}
              onClose={closeGuardiaModal}
              onSelectGuardia={handleGuardiaSelected}
              guardias={currentRowForModal ? (rowPanelData[currentRowForModal.pauta_id]?.guardias || []) : []}
              loading={currentRowForModal ? (rowPanelData[currentRowForModal.pauta_id]?.loadingGuardias || false) : false}
              title="Seleccionar Guardia"
              mode="pauta-diaria"
              fecha={toDisplay(fecha)}
              rolNombre={currentRowForModal.rol_nombre}
              instalacionNombrePauta={currentRowForModal.instalacion_nombre}
            />
          </>
        )}

        {/* Modal de comentarios */}
        {currentComentarioData && (
          <ComentarioModal
            isOpen={showComentarioModal}
            onClose={closeComentarioModal}
            turnoId={currentComentarioData.turnoId}
            fecha={currentComentarioData.fecha}
            comentarioActual={currentComentarioData.comentarioActual}
            puestoNombre={currentComentarioData.puestoNombre}
            guardiaNombre={currentComentarioData.guardiaNombre}
            onComentarioSaved={handleComentarioSaved}
          />
        )}

        {/* Modal de horas extras */}
        {currentHorasExtrasData && (
          <HorasExtrasModal
            pautaId={currentHorasExtrasData.pautaId}
            guardiaNombre={currentHorasExtrasData.guardiaNombre}
            instalacionNombre={currentHorasExtrasData.instalacionNombre}
            rolNombre={currentHorasExtrasData.rolNombre}
            montoActual={currentHorasExtrasData.montoActual || 0}
            onGuardar={handleHorasExtrasSaved}
            isOpen={showHorasExtrasModal}
            onClose={closeHorasExtrasModal}
          />
        )}
      </div>
    </TooltipProvider>
  );
}