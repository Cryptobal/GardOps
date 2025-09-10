"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
import { mapearEstadoOperacionADisplay, mapearEstadoLegacyADisplay, crearTooltipEnriquecido } from '@/lib/estados-display';

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Trash2, Info, Calendar, Users, ExternalLink, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import ConfirmDeleteModal from "../../../components/ui/confirm-delete-modal";
import { GuardiaSearchModal } from "../../../components/ui/guardia-search-modal";
import { useToast } from "../../../components/ui/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModalFechaInicioAsignacion from "../../../components/ui/modal-fecha-inicio-asignacion";

interface PautaGuardia {
  id: string;
  nombre: string;
  nombre_puesto: string;
  patron_turno: string;
  dias: string[];
  tipo?: 'asignado' | 'ppc' | 'sin_asignar';
  es_ppc?: boolean;
  guardia_id?: string;
  rol_nombre?: string;
  cobertura_por_dia?: any[]; // Array de coberturas por día
}

interface PautaTableProps {
  pautaData: PautaGuardia[];
  diasDelMes: number[];
  diasSemana: {dia: number, diaSemana: string, esFeriado: boolean}[];
  onUpdatePauta: (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => void;
  onDeleteGuardia: (guardiaIndex: number) => void;
  modoEdicion?: boolean;
  diasGuardados?: Set<string>; // Nuevo prop para indicar días guardados
  mes?: number; // Mes actual de la pauta
  anio?: number; // Año actual de la pauta
  startDay?: number; // 1-based inclusive
  endDay?: number;   // 1-based inclusive
}

interface ModalAutocompletarPautaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (diaInicio: number) => void;
  id: string;
  patron_turno: string;
  diaSeleccionado: number;
  diaSemanaSeleccionado: string;
}

// Hook para manejar el tamaño de la ventana
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// Función para acortar el nombre del PPC
const acortarNombrePPC = (nombre: string): string => {
  if (nombre.startsWith('PPC ')) {
    return nombre; // Ya viene acortado del backend
  }
  return nombre;
};

// Función para truncar UUID mostrando inicio y fin
const truncateMiddle = (s: string, head: number = 8, tail: number = 6): string => {
  if (!s || s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
};

// Función para obtener feriados de Chile (2024-2025)
const getFeriadosChile = (year: number, month: number): number[] => {
  const feriados = {
    2024: {
      1: [1], // Año Nuevo
      2: [], // No hay feriados en febrero
      3: [29], // Viernes Santo
      4: [1], // Domingo de Resurrección
      5: [1], // Día del Trabajo
      6: [7], // Glorias Navales
      7: [16], // Virgen del Carmen
      8: [15], // Asunción de la Virgen
      9: [18, 19], // Fiestas Patrias
      10: [12], // Encuentro de Dos Mundos
      11: [1], // Día de Todos los Santos
      12: [8, 25] // Inmaculada Concepción, Navidad
    },
    2025: {
      1: [1], // Año Nuevo
      2: [], // No hay feriados en febrero
      3: [18, 19], // Viernes Santo, Domingo de Resurrección
      4: [], // No hay feriados en abril
      5: [1], // Día del Trabajo
      6: [7], // Glorias Navales
      7: [16], // Virgen del Carmen
      8: [15], // Asunción de la Virgen
      9: [18, 19], // Fiestas Patrias
      10: [12], // Encuentro de Dos Mundos
      11: [1], // Día de Todos los Santos
      12: [8, 25] // Inmaculada Concepción, Navidad
    }
  };
  
  return feriados[year as keyof typeof feriados]?.[month as keyof typeof feriados[2024]] || [];
};

// Modal para autocompletar pauta
const ModalAutocompletarPauta = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  id, 
  patron_turno, 
  diaSeleccionado, 
  diaSemanaSeleccionado 
}: ModalAutocompletarPautaProps) => {
  const [diaInicio, setDiaInicio] = useState(1);

  const extraerTipoTurno = (patron: string): string => {
    if (patron.includes("4x4")) return "4x4";
    if (patron.includes("5x2")) return "5x2";
    if (patron.includes("7x7")) return "7x7";
    if (patron.includes("6x1")) return "6x1";
    return "4x4";
  };

  const tipoTurno = extraerTipoTurno(patron_turno);
  
  const patrones = {
    "4x4": { trabajo: 4, libre: 4, descripcion: "4 días trabajo + 4 días libre" },
    "5x2": { trabajo: 5, libre: 2, descripcion: "5 días trabajo + 2 días libre" },
    "7x7": { trabajo: 7, libre: 7, descripcion: "7 días trabajo + 7 días libre" },
    "6x1": { trabajo: 6, libre: 1, descripcion: "6 días trabajo + 1 día libre" }
  };

  const patron = patrones[tipoTurno as keyof typeof patrones];
  const cicloCompleto = patron.trabajo + patron.libre;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Autocompletar Pauta</h3>
        </div>
        
        <div className="space-y-4">
          {/* Información del patrón */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-gray-900 dark:text-white">Patrón: {tipoTurno}</p>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{patron.descripcion}</p>
              </div>
            </div>
          </div>

          {/* Información del día seleccionado */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Día seleccionado:</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {diaSemanaSeleccionado} {diaSeleccionado}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                El patrón comenzará desde este día
              </p>
            </div>
          </div>

          {/* Selector visual del patrón - UNA LÍNEA */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-white">
              Punto de inicio del ciclo:
            </label>
            
            <div className="flex gap-1 justify-center">
              {Array.from({ length: cicloCompleto }, (_, i) => {
                const esDiaTrabajo = i < patron.trabajo;
                const isSelected = diaInicio === i + 1;
                
                return (
                  <button
                    key={i}
                    onClick={() => setDiaInicio(i + 1)}
                    className={`
                      w-10 h-10 rounded-md text-xs font-bold transition-all duration-200
                      flex items-center justify-center border-2 shadow-sm
                      ${isSelected 
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-110 shadow-lg' 
                        : 'hover:scale-105 hover:shadow-md'
                      }
                      ${esDiaTrabajo 
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white border-emerald-400 hover:from-emerald-400 hover:to-green-500' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700'
                      }
                    `}
                    title={`Día ${i + 1} del ciclo - ${esDiaTrabajo ? 'Trabajando' : 'Libre'}`}
                  >
                    {esDiaTrabajo ? 'T' : 'L'}
                  </button>
                );
              })}
            </div>
            
            {/* Leyenda */}
            <div className="flex justify-center gap-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                <span>T = Trabajo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600"></div>
                <span>L = Libre</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(diaInicio)} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            Autocompletar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// Función centralizada para obtener el display del estado - LÓGICA ESTÁNDAR ACTUALIZADA
const getEstadoDisplay = (
  estado: string, 
  cobertura: any = null, 
  esPPC: boolean = false,
  estado_operacion?: string,
  plan_base?: string,
  estado_rrhh?: string,
  turno_extra_guardia_nombre?: string
) => {
  // PRIORIDAD 1: Si tenemos estado_operacion granular, usarlo
  if (estado_operacion) {
    return mapearEstadoOperacionADisplay(
      estado_operacion, 
      plan_base, 
      estado_rrhh, 
      turno_extra_guardia_nombre
    );
  }
  
  // PRIORIDAD 2: Compatibilidad con estados legacy
  return mapearEstadoLegacyADisplay(estado, cobertura, esPPC);
};

// Componente para renderizar el estado del día
const DiaCell = ({ 
  estado, 
  onClick, 
  onRightClick,
  guardiaNombre,
  diaNumero,
  diaSemana,
  esFeriado,
  modoEdicion = false,
  diasGuardados,
  esPPC = false,
  cobertura = null
}: { 
  estado: string; 
  onClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  guardiaNombre: string;
  diaNumero: number;
  diaSemana?: string;
  esFeriado?: boolean;
  modoEdicion?: boolean;
  diasGuardados?: Set<string>;
  esPPC?: boolean;
  cobertura?: any;
}) => {
  const { icon, text, className, iconColor, tooltip } = getEstadoDisplay(estado, cobertura, esPPC);

  const esFinDeSemana = diaSemana === 'Sáb' || diaSemana === 'Dom';
  const esDiaEspecial = esFinDeSemana || esFeriado;
  const isDiaGuardado = diasGuardados?.has(`${guardiaNombre}-${diaNumero}`);
  
  const clasesEspeciales = '';
  // Sin fondos para feriados/fin de semana en celdas; acento solo en header
  const clasesFeriado = '';
  const clasesFinDeSemana = '';
  
  // Clases para edición - ahora PPCs también son editables
  const clasesModoEdicion = modoEdicion 
    ? 'cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200' 
    : 'cursor-pointer hover:scale-102 hover:shadow-sm hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-500 transition-all duration-200';
  const clasesGuardado = '';

  const handleClick = () => {
    logger.debug('👆 Clic en celda detectado:', { guardiaNombre, diaNumero, estado, isDiaGuardado, esPPC });
    if (onClick) {
      onClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    logger.debug('🖱️ Clic derecho en celda detectado:', { guardiaNombre, diaNumero, estado, isDiaGuardado, esPPC });
    if (onRightClick) {
      onRightClick(e);
    }
  };

  // Usar tooltip enriquecido con información completa
  const tooltipText = crearTooltipEnriquecido(
    guardiaNombre,
    diaNumero,
    diaSemana,
    undefined, // plan_base (se agregará cuando esté disponible)
    undefined, // estado_rrhh (se agregará cuando esté disponible)
    undefined, // estado_operacion (se agregará cuando esté disponible)
    undefined, // turno_extra_guardia_nombre (se agregará cuando esté disponible)
    esFeriado,
    isDiaGuardado,
    esPPC,
    modoEdicion
  );

  return (
    <TableCell 
      className={`text-center transition-all duration-200 p-0 border-0 !border-b-0 ${className} ${clasesEspeciales} ${clasesFeriado} ${clasesFinDeSemana} ${clasesModoEdicion} ${clasesGuardado}`}
      style={{ border: 'none', outline: 'none', borderWidth: '0px', borderStyle: 'none', borderBottom: 'none' }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={tooltipText}
    >
      <div className="flex flex-col items-center justify-center min-h-[2.5rem] py-2 relative">
        {diaSemana && (
          <span className={`text-xs font-bold leading-none mb-1 ${
            esFeriado ? 'text-red-700 dark:text-red-300' : 
            esFinDeSemana ? 'text-amber-700 dark:text-amber-300' : 
            'text-gray-400 dark:text-gray-500'
          }`}>
            {diaSemana}
          </span>
        )}
        
        <div className={`flex items-center justify-center`}>
          <span className={`${icon === '⟲' ? 'text-4xl' : icon === '▲' ? 'text-3xl' : 'text-xl'} font-bold ${iconColor || 'text-gray-400'} drop-shadow-sm`}>
            {icon}
          </span>
          {/* Indicador adicional para estados críticos */}
          {estado === 'i' && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </TableCell>
  );
};

export default function PautaTable({ 
  pautaData, 
  diasDelMes, 
  diasSemana, 
  onUpdatePauta, 
  onDeleteGuardia,
  modoEdicion = false,
  diasGuardados,
  mes,
  anio,
  startDay,
  endDay
}: PautaTableProps) {
  const router = useRouter();
  
  const [autocompletadoModal, setAutocompletadoModal] = useState<{
    isOpen: boolean;
    guardiaIndex: number;
    diaIndex: number;
    diaSeleccionado: number;
    diaSemanaSeleccionado: string;
  }>({
    isOpen: false,
    guardiaIndex: 0,
    diaIndex: 0,
    diaSeleccionado: 1,
    diaSemanaSeleccionado: ''
  });

  // Estado para el modal de confirmación de eliminación
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    guardiaIndex: number | null;
  }>({
    isOpen: false,
    guardiaIndex: null
  });

  // Estado para el modal de asignación de guardia a PPC
  const [asignacionModal, setAsignacionModal] = useState<{
    isOpen: boolean;
    ppcData: PautaGuardia | null;
  }>({
    isOpen: false,
    ppcData: null
  });

  // Estado para los guardias disponibles
  const [guardiasDisponibles, setGuardiasDisponibles] = useState<any[]>([]);
  const [cargandoGuardias, setCargandoGuardias] = useState(false);
  
  // Estado para modal de fecha de inicio
  const [modalFechaInicio, setModalFechaInicio] = useState({
    isOpen: false,
    guardiaId: '',
    guardiaNombre: '',
    guardiaInstalacionActual: '',
    ppcId: '',
    instalacionNombre: '',
    rolServicioNombre: ''
  });

  const { toast } = useToast();

  const { width } = useWindowSize();

  // Obtener el año y mes actual para los feriados
  const fechaActual = new Date();
  const year = fechaActual.getFullYear();
  const month = fechaActual.getMonth() + 1;
  const feriadosChile = getFeriadosChile(year, month);

  // Ordenar los datos: puestos cubiertos primero, PPC después
  const pautaDataOrdenada = [...pautaData].sort((a, b) => {
    // Si ambos son PPC o ambos no son PPC, mantener orden original
    if (a.es_ppc === b.es_ppc) return 0;
    // Puestos cubiertos primero (es_ppc = false)
    if (!a.es_ppc && b.es_ppc) return -1;
    // PPC después (es_ppc = true)
    return 1;
  });

  // Nueva función para navegar a pauta diaria
  const navegarAPautaDiaria = (diaNumero: number) => {
    // Usar valores de props o fallback a fecha actual
    const year = anio || new Date().getFullYear();
    const month = mes || (new Date().getMonth() + 1);
    
    // Formatear la fecha como YYYY-MM-DD
    const fechaFormateada = `${year}-${month.toString().padStart(2, '0')}-${diaNumero.toString().padStart(2, '0')}`;
    
    logger.debug('🚀 Navegando a pauta diaria:', fechaFormateada);
    router.push(`/pauta-diaria/${fechaFormateada}`);
  };

  const cambiarEstadoDia = (guardiaIndex: number, dayNumber: number) => {
    if (!modoEdicion) return;
    
    const diaIndex = dayNumber - 1;
    const guardiaOrdenada = pautaDataOrdenada[guardiaIndex];
    const estadoActual = guardiaOrdenada.dias[diaIndex];
    
    // Encontrar el índice original en pautaData
    const indiceOriginal = pautaData.findIndex(g => g.id === guardiaOrdenada.id);
    
    // Solo permitir alternar entre planificado y L para planificación
    const nuevoEstado = estadoActual === "planificado" ? "L" : "planificado";
    devLogger.process(' Estado actual:', estadoActual, '-> Nuevo estado:', nuevoEstado);
    devLogger.process(' Índice ordenado:', guardiaIndex, '-> Índice original:', indiceOriginal);
    onUpdatePauta(indiceOriginal, diaIndex, nuevoEstado);
  };

  const handleRightClick = (e: React.MouseEvent, guardiaIndex: number, dayNumber: number) => {
    if (!modoEdicion) return;
    
    e.preventDefault();
    const diaIndex = dayNumber - 1;
    logger.debug('🖱️ Clic derecho detectado:', { guardiaIndex, diaIndex });
    const diaInfo = diasSemana[diaIndex];
    setAutocompletadoModal({
      isOpen: true,
      guardiaIndex,
      diaIndex,
      diaSeleccionado: dayNumber,
      diaSemanaSeleccionado: diaInfo?.diaSemana || ''
    });
  };

  // Función para cargar guardias disponibles
  const cargarGuardias = async () => {
    try {
      setCargandoGuardias(true);
      logger.debug('🔄 Cargando guardias desde /api/guardias/disponibles...');
      
      // Usar la misma API que los otros módulos para consistencia
      const fecha = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD
      const params = new URLSearchParams({
        fecha
      });
      
      const response = await fetch(`/api/guardias/disponibles?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Guardias disponibles cargados:', { 
          data, 
          isArray: Array.isArray(data), 
          length: data?.length,
          hasItems: data?.items,
          itemsLength: data?.items?.length
        });
        
        // La API devuelve {items: [...]}, no un array directo
        const guardias = data?.items || data?.guardias || data || [];
        logger.debug('📋 Guardias disponibles procesados:', { guardias, length: guardias.length });
        setGuardiasDisponibles(guardias);
      } else {
        console.error('❌ Error cargando guardias disponibles:', response.statusText);
        setGuardiasDisponibles([]);
      }
    } catch (error) {
      console.error('❌ Error cargando guardias disponibles:', error);
      setGuardiasDisponibles([]);
    } finally {
      setCargandoGuardias(false);
    }
  };

  // Funciones para manejar asignación de guardia a PPC
  const openAsignacionModal = async (ppcData: PautaGuardia) => {
    logger.debug('🎯 Abriendo modal de asignación para PPC:', ppcData);
    
    // Cargar guardias antes de abrir el modal
    await cargarGuardias();
    
    setAsignacionModal({
      isOpen: true,
      ppcData
    });
  };

  const closeAsignacionModal = () => {
    setAsignacionModal({
      isOpen: false,
      ppcData: null
    });
  };

  const handleGuardiaSeleccionado = async (guardiaId: string) => {
    if (!asignacionModal.ppcData) return;

    // NUEVA LÓGICA: Solicitar fecha de inicio antes de asignar
    const guardiaInfo = guardiasDisponibles.find(g => g.id === guardiaId);
    
    console.log('🔍 Debug PautaTable - Abriendo modal fecha inicio:', {
      guardiaId,
      guardiaNombre: guardiaInfo?.nombre_completo,
      ppcId: asignacionModal.ppcData.id,
      instalacionNombre: asignacionModal.ppcData.nombre_puesto,
      rolServicioNombre: asignacionModal.ppcData.rol_nombre,
      asignacionModalCompleto: asignacionModal
    });
    
    setModalFechaInicio({
      isOpen: true,
      guardiaId: guardiaId,
      guardiaNombre: guardiaInfo?.nombre_completo || 'Guardia',
      guardiaInstalacionActual: guardiaInfo?.instalacion_actual_nombre || '',
      ppcId: asignacionModal.ppcData.id,
      instalacionNombre: asignacionModal.ppcData.nombre_puesto,
      rolServicioNombre: asignacionModal.ppcData.rol_nombre
    });
  };

  // Nueva función para confirmar asignación con fecha
  const handleConfirmarAsignacionConFecha = async (fechaInicio: string, observaciones?: string, guardia?: any) => {
    try {
      // Usar los datos del guardia pasados directamente o del estado
      const guardiaId = guardia?.id || modalFechaInicio.guardiaId;
      const ppcId = modalFechaInicio.ppcId;

      console.log('🔍 Debug PautaTable - Asignando guardia con fecha:', {
        guardiaId,
        ppcId,
        fechaInicio,
        guardiaPasado: !!guardia,
        guardiaObjeto: guardia,
        estadoModal: modalFechaInicio,
        asignacionModal: asignacionModal
      });
      
      const response = await fetch('/api/ppc/asignar-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: guardiaId,
          puesto_operativo_id: ppcId,
          fecha_inicio: fechaInicio,
          motivo_inicio: 'asignacion_pauta_mensual',
          observaciones
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al asignar guardia');
      }
      
      toast.success('Guardia asignado correctamente', 'Éxito');
      
      // Cerrar modales y limpiar estados
      setModalFechaInicio({
        isOpen: false,
        guardiaId: '',
        guardiaNombre: '',
        guardiaInstalacionActual: '',
        ppcId: '',
        instalacionNombre: '',
        rolServicioNombre: ''
      });
      closeAsignacionModal(); // Esto cierra el modal de búsqueda
      
      // Recargar la página para mostrar los cambios
      window.location.reload();
      
    } catch (error) {
      logger.error('Error asignando guardia::', error);
      toast.error('No se pudo asignar el guardia', 'Error');
    }
  };

  const autocompletarPauta = (diaInicio: number) => {
    const { guardiaIndex, diaSeleccionado } = autocompletadoModal;
    const guardia = pautaDataOrdenada[guardiaIndex];
    
    // Encontrar el índice original en pautaData
    const indiceOriginal = pautaData.findIndex(g => g.id === guardia.id);
    
    const extraerTipoTurno = (patron: string): string => {
      if (patron.includes("4x4")) return "4x4";
      if (patron.includes("5x2")) return "5x2";
      if (patron.includes("7x7")) return "7x7";
      if (patron.includes("6x1")) return "6x1";
      return "4x4";
    };
    
    const tipoTurno = extraerTipoTurno(guardia.patron_turno);
    
    const patrones = {
      "4x4": { trabajo: 4, libre: 4 },
      "5x2": { trabajo: 5, libre: 2 },
      "7x7": { trabajo: 7, libre: 7 },
      "6x1": { trabajo: 6, libre: 1 }
    };
    
    const patron = patrones[tipoTurno as keyof typeof patrones];
    const cicloCompleto = patron.trabajo + patron.libre;
    
    for (let i = 0; i < guardia.dias.length; i++) {
      if (i < diaSeleccionado - 1) continue;
      
      const diferenciaDesdeSeleccionado = i - (diaSeleccionado - 1);
      const diaDelCiclo = (diaInicio + diferenciaDesdeSeleccionado - 1) % cicloCompleto;
      const esDiaTrabajo = diaDelCiclo < patron.trabajo;
      
      onUpdatePauta(indiceOriginal, i, esDiaTrabajo ? "planificado" : "L");
    }
    
    setAutocompletadoModal({ isOpen: false, guardiaIndex: 0, diaIndex: 0, diaSeleccionado: 1, diaSemanaSeleccionado: '' });
  };

  const eliminarPautaGuardia = (guardiaIndex: number) => {
    if (!modoEdicion) return;
    
    const guardiaOrdenada = pautaDataOrdenada[guardiaIndex];
    
    const indiceOriginal = pautaData.findIndex(g => g.id === guardiaOrdenada.id);
    setDeleteModal({
      isOpen: true,
      guardiaIndex: indiceOriginal
    });
  };

  const confirmarEliminarPauta = async () => {
    if (deleteModal.guardiaIndex !== null) {
      onDeleteGuardia(deleteModal.guardiaIndex);
      setDeleteModal({ isOpen: false, guardiaIndex: null });
    }
  };

  // Determinar días visibles (rango opcional)
  const first = Math.max(1, startDay ?? 1);
  const last = Math.min(diasDelMes.length, endDay ?? diasDelMes.length);
  const visibleDays = diasDelMes.filter((d) => d >= first && d <= last);

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Pauta Mensual</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pautaDataOrdenada.length} guardia{pautaDataOrdenada.length !== 1 ? 's' : ''} • {diasDelMes.length} días
            </p>
          </div>
        </div>
        {/* Leyenda: en desktop visible; en móvil compacta via diálogo */}
        <div className="hidden sm:grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-lg font-bold">●</span>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Turno</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-lg font-bold">✓</span>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Asistió</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-lg font-bold">✗</span>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Sin Cobertura</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-center">
              <span className="text-fuchsia-600 dark:text-fuchsia-400 text-xs font-extrabold">TE</span>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Turno Extra</span>
          </div>
          {/* Se eliminan badges específicos de Reemplazo y PPC cubierto; todo es TE */}
        </div>
        <div className="sm:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Info className="h-4 w-4" />
                Leyenda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Leyenda</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-3"><span className="text-blue-600 text-lg font-bold">●</span> Turno</div>
                <div className="flex items-center gap-3"><span className="text-gray-500 text-lg font-bold">○</span> Libre</div>
                <div className="flex items-center gap-3"><span className="text-green-600 text-lg font-bold">✓</span> Asistió</div>
                <div className="flex items-center gap-3"><span className="text-red-600 text-lg font-bold">✗</span> Sin Cobertura</div>
                <div className="flex items-center gap-3"><span className="text-fuchsia-600 text-sm font-extrabold">TE</span> Turno Extra</div>
                <div className="flex items-center gap-3"><span className="text-red-600 text-lg font-bold">▲</span> Sin Cobertura</div>
                <div className="flex items-center gap-3"><span className="text-indigo-600 text-lg">🏖</span> Permiso</div>
                <div className="flex items-center gap-3"><span className="text-purple-600 text-lg">🌴</span> Vacaciones</div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Indicador de funcionalidad */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4" />
          <span>
            {modoEdicion 
              ? "Modo edición: Clic izquierdo para cambiar estado • Clic derecho para autocompletar"
              : "Haz clic en cualquier día para ver la pauta diaria de ese día"
            }
          </span>
        </div>
      </div>

      {/* Contenedor con scroll horizontal para móviles */}
      <div className="relative">
        {/* Indicador de scroll en móviles */}
        <div className="sm:hidden mb-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            <Info className="h-3 w-3" />
            <span>Desliza horizontalmente para ver todos los días del mes</span>
          </div>
        </div>

        {/* Tabla con scroll horizontal */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-x-auto">
          <div className="min-w-max">
            <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-transparent">
                <TableHead className="font-semibold text-left p-4 border-0 sticky left-0 bg-transparent z-10 text-gray-500 dark:text-gray-400" style={{width: '200px', minWidth: '200px'}}>
                    Guardia
                  </TableHead>
                  {visibleDays.map((dia) => {
                    const diaInfo = diasSemana[dia - 1];
                    const esFinDeSemana = diaInfo?.diaSemana === 'Sáb' || diaInfo?.diaSemana === 'Dom';
                    const esFeriado = diaInfo?.esFeriado || feriadosChile.includes(dia);
                  const clasesEspeciales = esFeriado
                    ? 'bg-transparent border-t-2 border-red-500/40'
                    : esFinDeSemana
                      ? 'bg-transparent border-t-2 border-amber-400/40'
                      : 'bg-transparent border-t border-gray-200 dark:border-gray-700';
                    
                    return (
                    <TableHead key={dia} className={`font-semibold text-center p-2 ${clasesEspeciales}`} style={{width: '35px', minWidth: '35px'}}>
                        <div className={`text-xs font-bold ${
                          esFeriado ? 'text-red-700 dark:text-red-300' : 
                          esFinDeSemana ? 'text-amber-700 dark:text-amber-300' : 
                          'text-gray-500 dark:text-gray-400'
                        }`}>{dia}</div>
                        {diaInfo?.diaSemana && (
                          <div className={`text-xs mt-1 font-medium ${
                            esFeriado ? 'text-red-600 dark:text-red-400' : 
                            esFinDeSemana ? 'text-amber-600 dark:text-amber-400' : 
                            'text-gray-500 dark:text-gray-400'
                          }`}>
                            {diaInfo.diaSemana}
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pautaDataOrdenada.map((guardia, guardiaIndex) => (
                  <TableRow 
                    key={guardiaIndex} 
                  className={`group border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50`}
                  >
                    <TableCell className="p-4 border-0 whitespace-nowrap relative sticky left-0 bg-white dark:bg-gray-900 z-10">
                      <div className="flex items-center gap-3">
                        {/* Botón eliminar - ahora disponible para PPCs también */}
                        {modoEdicion && (
                          <button
                            onClick={() => eliminarPautaGuardia(guardiaIndex)}
                            className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110"
                            title="Eliminar pauta de este guardia"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        
                        {/* Información del guardia */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link 
                              href={guardia.es_ppc ? `/ppc` : `/guardias/${guardia.guardia_id || guardia.id}`}
                              className={`font-semibold text-sm truncate hover:underline transition-colors ${
                                guardia.es_ppc 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {guardia.es_ppc ? acortarNombrePPC(guardia.nombre) : guardia.nombre}
                              <ExternalLink className="inline-block h-3 w-3 ml-1 opacity-60" />
                            </Link>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                            <span className="font-medium">{guardia.nombre_puesto}</span>
                            {guardia.es_ppc && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                                  PPC
                                </span>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openAsignacionModal(guardia)}
                                  className="h-5 px-2 text-xs"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Asignar
                                </Button>
                              </div>
                            )}
                          </div>
                          {/* Rol de servicio */}
                          <div className="text-xs text-muted-foreground">
                            <span>{guardia.rol_nombre}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {visibleDays.map((day) => {
                      const diaIndex = day - 1;
                      const estado = guardia.dias[diaIndex];
                      const diaInfo = diasSemana[diaIndex];
                      const esFeriado = diaInfo?.esFeriado || feriadosChile.includes(day);
                      const cobertura = guardia.cobertura_por_dia ? guardia.cobertura_por_dia[diaIndex] : null;
                      return (
                        <DiaCell
                          key={day}
                          estado={estado}
                          onClick={() => cambiarEstadoDia(guardiaIndex, day)}
                          onRightClick={(e) => handleRightClick(e, guardiaIndex, day)}
                          guardiaNombre={guardia.nombre}
                          diaNumero={day}
                          diaSemana={diaInfo?.diaSemana}
                          esFeriado={esFeriado}
                          modoEdicion={modoEdicion}
                          diasGuardados={diasGuardados}
                          esPPC={guardia.es_ppc}
                          cobertura={cobertura}
                        />
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Modal de autocompletado */}
      <ModalAutocompletarPauta
        isOpen={autocompletadoModal.isOpen}
        onClose={() => setAutocompletadoModal({ isOpen: false, guardiaIndex: 0, diaIndex: 0, diaSeleccionado: 1, diaSemanaSeleccionado: '' })}
        onConfirm={autocompletarPauta}
        id={pautaDataOrdenada[autocompletadoModal.guardiaIndex]?.id || ""}
        patron_turno={pautaDataOrdenada[autocompletadoModal.guardiaIndex]?.patron_turno || ""}
        diaSeleccionado={autocompletadoModal.diaSeleccionado}
        diaSemanaSeleccionado={autocompletadoModal.diaSemanaSeleccionado}
      />

      {/* Modal de confirmación de eliminación */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, guardiaIndex: null })}
        onConfirm={confirmarEliminarPauta}
        title="Eliminar Turnos Asignados"
        message={`¿Estás seguro de que quieres eliminar todos los turnos asignados de ${deleteModal.guardiaIndex !== null ? pautaDataOrdenada[deleteModal.guardiaIndex]?.nombre : ''}? Esta acción limpiará la programación pero mantendrá al guardia en la lista.`}
      />

      {/* Modal de asignación de guardia a PPC */}
      {asignacionModal.isOpen && asignacionModal.ppcData && (
        <>
          {console.log('🔍 RENDERIZANDO MODAL con props:', {
            isOpen: asignacionModal.isOpen,
            guardias: guardiasDisponibles,
            guardiasIsArray: Array.isArray(guardiasDisponibles),
            guardiasLength: guardiasDisponibles?.length,
            loading: cargandoGuardias,
            mode: 'pauta-mensual'
          })}
          <GuardiaSearchModal
            isOpen={asignacionModal.isOpen}
            onClose={closeAsignacionModal}
            onSelectGuardia={handleGuardiaSeleccionado}
            guardias={guardiasDisponibles}
            loading={cargandoGuardias}
            mode="pauta-mensual"
            instalacionNombrePauta={asignacionModal.ppcData.nombre_puesto}
            rolNombre={asignacionModal.ppcData.rol_nombre}
            fecha={`${anio || new Date().getFullYear()}-${(mes || new Date().getMonth() + 1).toString().padStart(2, '0')}`}
            onConfirmarAsignacionConFecha={handleConfirmarAsignacionConFecha}
            ppcId={asignacionModal.ppcData.id}
          />
        </>
      )}

      {/* Modal de fecha de inicio de asignación */}
      <ModalFechaInicioAsignacion
        isOpen={modalFechaInicio.isOpen}
        onClose={() => {
          console.log('🔍 Cerrando modal de fecha inicio en PautaTable');
          setModalFechaInicio({
            isOpen: false,
            guardiaId: '',
            guardiaNombre: '',
            guardiaInstalacionActual: '',
            ppcId: '',
            instalacionNombre: '',
            rolServicioNombre: ''
          });
        }}
        onConfirmar={handleConfirmarAsignacionConFecha}
        guardiaNombre={modalFechaInicio.guardiaNombre}
        guardiaInstalacionActual={modalFechaInicio.guardiaInstalacionActual}
        nuevaInstalacionNombre={modalFechaInicio.instalacionNombre}
        nuevoRolServicioNombre={modalFechaInicio.rolServicioNombre}
        esReasignacion={!!modalFechaInicio.guardiaInstalacionActual}
      />
    </div>
  );
} 