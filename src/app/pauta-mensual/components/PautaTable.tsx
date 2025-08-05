"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Trash2, Info, Calendar, Users, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import ConfirmDeleteModal from "../../../components/ui/confirm-delete-modal";
import Link from "next/link";

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
}

interface PautaTableProps {
  pautaData: PautaGuardia[];
  diasDelMes: number[];
  diasSemana: {dia: number, diaSemana: string, esFeriado: boolean}[];
  onUpdatePauta: (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => void;
  onDeleteGuardia: (guardiaIndex: number) => void;
  modoEdicion?: boolean;
  diasGuardados?: Set<string>; // Nuevo prop para indicar días guardados
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

          {/* Selector visual del patrón - EN UNA LÍNEA */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-white">
              Punto de inicio del ciclo:
            </label>
            
            <div className="flex gap-1 justify-center flex-wrap">
              {Array.from({ length: cicloCompleto }, (_, i) => {
                const esDiaTrabajo = i < patron.trabajo;
                const isSelected = diaInicio === i + 1;
                
                return (
                  <button
                    key={i}
                    onClick={() => setDiaInicio(i + 1)}
                    className={`
                      w-8 h-8 rounded-md text-xs font-bold transition-all duration-200
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

// Función centralizada para obtener el display del estado - INCLUYENDO TRABAJADO
const getEstadoDisplay = (estado: string) => {
  // Normalizar el estado para comparación
  const estadoNormalizado = estado?.toLowerCase() || '';
  
  switch (estadoNormalizado) {
    case "trabajado":
      return { 
        icon: "✅", 
        text: "T", 
        className: "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-300 border-0 outline-0",
        tooltip: "Trabajado"
      };
    case "t":
      return { 
        icon: "🟢", 
        text: "T", 
        className: "bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-800 dark:text-emerald-300 border-0 outline-0",
        tooltip: "Turno"
      };
    case "libre":
    case "l":
      return { 
        icon: "⚪", 
        text: "L", 
        className: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-600 dark:text-gray-400 border-0 outline-0",
        tooltip: "Libre"
      };
    case "inasistencia":
      return { 
        icon: "❌", 
        text: "I", 
        className: "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 text-red-800 dark:text-red-300 border-0 outline-0",
        tooltip: "Inasistencia"
      };
    case "reemplazo":
      return { 
        icon: "🔄", 
        text: "R", 
        className: "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 text-orange-800 dark:text-orange-300 border-0 outline-0",
        tooltip: "Reemplazo"
      };
    default:
      return { 
        icon: "⬜", 
        text: "", 
        className: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-400 dark:text-gray-600 border-0 outline-0",
        tooltip: "Sin asignar"
      };
  }
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
  esPPC = false
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
}) => {
  const { icon, text, className, tooltip } = getEstadoDisplay(estado);

  const esFinDeSemana = diaSemana === 'Sáb' || diaSemana === 'Dom';
  const esDiaEspecial = esFinDeSemana || esFeriado;
  const isDiaGuardado = diasGuardados?.has(`${guardiaNombre}-${diaNumero}`);
  
  const clasesEspeciales = ''; // Eliminado el ring amber
  const clasesFeriado = esFeriado ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30' : '';
  const clasesFinDeSemana = esFinDeSemana ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20' : '';
  
  // Clases para edición - ahora PPCs también son editables
  const clasesModoEdicion = modoEdicion ? 'cursor-pointer hover:scale-105 hover:shadow-sm' : 'cursor-default opacity-90';
  const clasesGuardado = '';

  const handleClick = () => {
    console.log('👆 Clic en celda detectado:', { guardiaNombre, diaNumero, estado, isDiaGuardado, esPPC });
    if (onClick) {
      onClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    console.log('🖱️ Clic derecho en celda detectado:', { guardiaNombre, diaNumero, estado, isDiaGuardado, esPPC });
    if (onRightClick) {
      onRightClick(e);
    }
  };

  const tooltipText = `${guardiaNombre} - Día ${diaNumero} (${diaSemana || ''})${esFeriado ? ' - FERIADO' : ''}: ${tooltip}${isDiaGuardado ? ' - ✅ Guardado en BD' : ''}${esPPC ? ' - PPC' : ''}${!modoEdicion ? ' - Modo solo lectura' : ''}`;

  return (
    <TableCell 
      className={`text-center transition-all duration-200 p-0 border-0 !border-b-0 ${className} ${clasesEspeciales} ${clasesFeriado} ${clasesFinDeSemana} ${clasesModoEdicion} ${clasesGuardado}`}
      style={{ border: 'none', outline: 'none', borderWidth: '0px', borderStyle: 'none', borderBottom: 'none' }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={tooltipText}
    >
      <div className="flex flex-col items-center justify-center min-h-[2.5rem] py-1 relative">
        {diaSemana && (
          <span className={`text-xs font-semibold leading-none mb-1 ${
            esFeriado ? 'text-red-600 dark:text-red-400' : 
            esFinDeSemana ? 'text-amber-600 dark:text-amber-400' : 
            'text-gray-500 dark:text-gray-400'
          }`}>
            {diaSemana}
          </span>
        )}
        
        <span className="text-sm leading-none">{icon}</span>
        {text && <span className="text-xs font-bold leading-none mt-0.5">{text}</span>}
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
  diasGuardados
}: PautaTableProps) {
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

  const cambiarEstadoDia = (guardiaIndex: number, diaIndex: number) => {
    if (!modoEdicion) return;
    
    const guardiaOrdenada = pautaDataOrdenada[guardiaIndex];
    
    console.log('🔄 Cambiando estado de día:', { guardiaIndex, diaIndex });
    const estadoActual = guardiaOrdenada.dias[diaIndex];
    
    // Encontrar el índice original en pautaData
    const indiceOriginal = pautaData.findIndex(g => g.id === guardiaOrdenada.id);
    
    // Solo permitir alternar entre T y L
    const nuevoEstado = estadoActual === "T" ? "L" : "T";
    console.log('🔄 Estado actual:', estadoActual, '-> Nuevo estado:', nuevoEstado);
    console.log('🔄 Índice ordenado:', guardiaIndex, '-> Índice original:', indiceOriginal);
    onUpdatePauta(indiceOriginal, diaIndex, nuevoEstado);
  };

  const handleRightClick = (e: React.MouseEvent, guardiaIndex: number, diaIndex: number) => {
    if (!modoEdicion) return;
    
    e.preventDefault();
    console.log('🖱️ Clic derecho detectado:', { guardiaIndex, diaIndex });
    const diaInfo = diasSemana[diaIndex];
    setAutocompletadoModal({
      isOpen: true,
      guardiaIndex,
      diaIndex,
      diaSeleccionado: diaIndex + 1,
      diaSemanaSeleccionado: diaInfo?.diaSemana || ''
    });
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
      
      onUpdatePauta(indiceOriginal, i, esDiaTrabajo ? "T" : "L");
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
        
        {/* Leyenda mejorada - Solo T y L */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-300 dark:border-emerald-600 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300 hidden sm:inline">Turno</span>
            <span className="text-gray-700 dark:text-gray-300 sm:hidden">T</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border border-gray-300 dark:border-gray-600 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300 hidden sm:inline">Libre</span>
            <span className="text-gray-700 dark:text-gray-300 sm:hidden">L</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 border border-red-300 dark:border-red-600 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300 hidden sm:inline">Feriado</span>
            <span className="text-gray-700 dark:text-gray-300 sm:hidden">F</span>
          </div>
          {modoEdicion && (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 border border-red-300 dark:border-red-600 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300 hidden sm:inline">PPC</span>
              <span className="text-gray-700 dark:text-gray-300 sm:hidden">PPC</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor con scroll horizontal para móviles */}
      <div className="relative">
        {/* Indicador de scroll en móviles */}
        <div className="sm:hidden mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <Info className="h-3 w-3" />
            <span>Desliza horizontalmente para ver todos los días del mes</span>
          </div>
        </div>

        {/* Tabla con scroll horizontal */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-x-auto">
          <div className="min-w-max">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                  <TableHead className="font-semibold text-left p-4 border-0 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 z-10" style={{width: '200px', minWidth: '200px'}}>
                    Guardia
                  </TableHead>
                  {diasDelMes.map((dia) => {
                    const diaInfo = diasSemana[dia - 1];
                    const esFinDeSemana = diaInfo?.diaSemana === 'Sáb' || diaInfo?.diaSemana === 'Dom';
                    const esFeriado = diaInfo?.esFeriado || feriadosChile.includes(dia);
                    const clasesEspeciales = esFeriado ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/40' : 
                                               esFinDeSemana ? 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30' : '';
                    
                    return (
                      <TableHead key={dia} className={`font-semibold text-center p-2 border-0 ${clasesEspeciales}`} style={{width: '35px', minWidth: '35px'}}>
                        <div className="text-xs font-bold text-gray-900 dark:text-white">{dia}</div>
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
                    className={`group border-0 ${
                      guardia.es_ppc 
                        ? 'bg-gradient-to-r from-red-50/30 to-red-100/30 dark:from-red-900/10 dark:to-red-800/10 hover:from-red-50/50 hover:to-red-100/50 dark:hover:from-red-900/20 dark:hover:to-red-800/20' 
                        : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                    }`}
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
                            <span className="font-medium">{guardia.rol_nombre || guardia.nombre_puesto}</span>
                            {guardia.es_ppc && (
                              <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                                PPC
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {guardia.dias.map((estado, diaIndex) => {
                      const diaInfo = diasSemana[diaIndex];
                      const esFeriado = diaInfo?.esFeriado || feriadosChile.includes(diaIndex + 1);
                      return (
                        <DiaCell
                          key={diaIndex}
                          estado={estado}
                          onClick={() => cambiarEstadoDia(guardiaIndex, diaIndex)}
                          onRightClick={(e) => handleRightClick(e, guardiaIndex, diaIndex)}
                          guardiaNombre={guardia.nombre}
                          diaNumero={diaIndex + 1}
                          diaSemana={diaInfo?.diaSemana}
                          esFeriado={esFeriado}
                          modoEdicion={modoEdicion}
                          diasGuardados={diasGuardados}
                          esPPC={guardia.es_ppc}
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
    </div>
  );
} 