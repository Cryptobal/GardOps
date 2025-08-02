"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { 
  Calendar, 
  Building2, 
  Play,
  Clock,
  Users,
  TrendingUp,
  Download,
  FileText,
  RotateCcw,
  Info,
  Trash2,
  Save
} from "lucide-react";
import { obtenerInstalaciones } from "../../lib/api/instalaciones";
import { guardarPautaMensual, obtenerPautaMensual } from "../../lib/api/pauta-mensual";
import dayjs from "dayjs";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Función para obtener feriados chilenos (2024-2025)
const obtenerFeriadosChilenos = (anio: number): Date[] => {
  const feriados = [
    // Feriados fijos
    new Date(anio, 0, 1),   // Año Nuevo
    new Date(anio, 4, 1),   // Día del Trabajo
    new Date(anio, 4, 21),  // Glorias Navales
    new Date(anio, 5, 29),  // San Pedro y San Pablo
    new Date(anio, 6, 16),  // Virgen del Carmen
    new Date(anio, 7, 15),  // Asunción de la Virgen
    new Date(anio, 8, 18),  // Independencia Nacional
    new Date(anio, 8, 19),  // Glorias del Ejército
    new Date(anio, 9, 12),  // Encuentro de Dos Mundos
    new Date(anio, 10, 1),  // Día de Todos los Santos
    new Date(anio, 10, 8),  // Inmaculada Concepción
    new Date(anio, 11, 25), // Navidad
  ];

  // Feriados variables (aproximados para 2024-2025)
  if (anio === 2024) {
    feriados.push(
      new Date(2024, 3, 1),  // Viernes Santo (aproximado)
      new Date(2024, 3, 2),  // Sábado Santo (aproximado)
      new Date(2024, 5, 20), // Corpus Christi (aproximado)
      new Date(2024, 8, 20), // Fiestas Patrias (día adicional)
    );
  } else if (anio === 2025) {
    feriados.push(
      new Date(2025, 3, 18), // Viernes Santo (aproximado)
      new Date(2025, 3, 19), // Sábado Santo (aproximado)
      new Date(2025, 5, 12), // Corpus Christi (aproximado)
      new Date(2025, 8, 19), // Fiestas Patrias (día adicional)
    );
  }

  return feriados;
};

// Función para verificar si una fecha es feriado
const esFeriado = (fecha: Date): boolean => {
  const feriados = obtenerFeriadosChilenos(fecha.getFullYear());
  return feriados.some(feriado => 
    feriado.getDate() === fecha.getDate() && 
    feriado.getMonth() === fecha.getMonth() && 
    feriado.getFullYear() === fecha.getFullYear()
  );
};

interface Instalacion {
  id: string;
  nombre: string;
  direccion: string;
  estado: string;
}

interface PautaGuardia {
  id?: string;
  nombre: string;
  rol: string;
  dias: string[];
}

interface AutocompletadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (diaInicio: number) => void;
  guardiaIndex: number;
  diaIndex: number;
  diasDisponibles: number;
  turnoGuardia: string;
  diaSeleccionado: number;
  diaSemanaSeleccionado: string;
}

interface EliminarPautaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  guardiaNombre: string;
}

interface ModificarPautaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  guardiaNombre: string;
  diaNumero: number;
  estadoActual: string;
  nuevoEstado: string;
}





// Modal para autocompletado
const AutocompletadoModal = ({ isOpen, onClose, onConfirm, guardiaIndex, diaIndex, diasDisponibles, turnoGuardia, diaSeleccionado, diaSemanaSeleccionado }: AutocompletadoModalProps) => {
  const [diaInicio, setDiaInicio] = useState(1);

  // Extraer el tipo de turno del rol de la guardia
  const extraerTipoTurno = (rol: string): string => {
    if (rol.includes("4x4")) return "4x4";
    if (rol.includes("5x2")) return "5x2";
    if (rol.includes("7x7")) return "7x7";
    if (rol.includes("6x1")) return "6x1";
    return "4x4"; // Por defecto
  };

  const tipoTurno = extraerTipoTurno(turnoGuardia);
  
  // Definir patrones de turnos
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 dark:bg-gray-800 rounded-lg p-6 w-[500px] max-w-[90vw] border border-gray-700"
      >
        <h3 className="text-lg font-semibold mb-4 text-white">Autocompletar Pauta</h3>
        
        <div className="space-y-4">
          {/* Información del turno */}
          <div className="bg-gray-800 dark:bg-gray-700 p-3 rounded-lg border border-gray-600">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-100">Turno de la guardia:</p>
                <p className="text-xs text-gray-300 mt-1">{turnoGuardia}</p>
              </div>
            </div>
          </div>

          {/* Información del día seleccionado */}
          <div className="bg-blue-800 dark:bg-blue-700 p-4 rounded-lg border border-blue-600">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-blue-400 flex-shrink-0" />
              <div className="text-center flex-1">
                <p className="text-sm font-medium text-blue-200 mb-2">Día seleccionado:</p>
                <p className="text-xl font-bold text-blue-100 mb-1">
                  {diaSemanaSeleccionado} {diaSeleccionado}
                </p>
                <p className="text-xs text-blue-300">
                  El patrón comenzará desde este día hacia adelante
                </p>
              </div>
            </div>
          </div>

          {/* Selector visual del patrón */}
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-100">
              Selecciona en qué punto del ciclo comenzar:
            </label>
            
            {/* Visualización del patrón clickeable */}
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: cicloCompleto }, (_, i) => {
                const esDiaTrabajo = i < patron.trabajo;
                const isSelected = diaInicio === i + 1;
                
                return (
                  <button
                    key={i}
                    onClick={() => setDiaInicio(i + 1)}
                    className={`
                      w-10 h-10 rounded-lg text-sm font-bold transition-all duration-200
                      flex items-center justify-center border-2
                      ${isSelected 
                        ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900 scale-110' 
                        : 'hover:scale-105 hover:ring-1 hover:ring-blue-300'
                      }
                      ${esDiaTrabajo 
                        ? 'bg-green-600 text-white border-green-500 hover:bg-green-500' 
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }
                    `}
                    title={`Día ${i + 1} del ciclo - ${esDiaTrabajo ? 'Trabajando' : 'Libre'}`}
                  >
                    {esDiaTrabajo ? 'T' : 'L'}
                  </button>
                );
              })}
            </div>
            
            <p className="text-xs text-gray-400 mt-2 text-center">
              Clic en un bloque para seleccionar el punto de inicio del patrón
            </p>
          </div>

          {/* Información del patrón */}
          <div className="bg-blue-900/20 border border-blue-700 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                <p className="font-medium">Patrón: {tipoTurno}</p>
                <p className="text-xs mt-1">{patron.descripcion}</p>
                <p className="text-xs mt-2">
                  <strong>Seleccionaste el día {diaInicio} del ciclo</strong>
                </p>
                <p className="text-xs mt-1">
                  El día {diaSeleccionado} del mes será el día {diaInicio} del ciclo, y el patrón se aplicará hacia adelante
                </p>
              </div>
            </div>
          </div>

          {/* Ejemplo de aplicación */}
          <div className="bg-yellow-900/20 border border-yellow-700 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-200">
                <p className="font-medium">Ejemplo de aplicación:</p>
                <p>Si seleccionas el bloque {diaInicio}, el día {diaSeleccionado} del mes será el día {diaInicio} del ciclo:</p>
                <p>Día {diaSeleccionado} del mes = Día {diaInicio} del ciclo | El patrón se aplicará desde el día {diaSeleccionado} hacia adelante</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700">
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(diaInicio)} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Autocompletar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal para confirmar modificación de pauta asignada
const ModificarPautaModal = ({ isOpen, onClose, onConfirm, guardiaNombre, diaNumero, estadoActual, nuevoEstado }: ModificarPautaModalProps) => {
  if (!isOpen) return null;

  const getEstadoDisplay = (estado: string) => {
    switch (estado) {
      case "T": return { text: "Trabajando", color: "text-green-400" };
      case "L": return { text: "Libre", color: "text-gray-400" };
      case "PPC": return { text: "Puesto por cubrir", color: "text-red-400" };
      case "LIC": return { text: "Licencia", color: "text-blue-400" };
      case "VAC": return { text: "Vacaciones", color: "text-yellow-400" };
      case "PGS": return { text: "Permiso con goce", color: "text-purple-400" };
      case "PSS": return { text: "Permiso sin goce", color: "text-orange-400" };
      default: return { text: "Vacío", color: "text-gray-500" };
    }
  };

  const estadoActualInfo = getEstadoDisplay(estadoActual);
  const nuevoEstadoInfo = getEstadoDisplay(nuevoEstado);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-yellow-900/20">
            <Info className="h-5 w-5 text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Modificar pauta asignada</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-3">
            Este turno forma parte de un patrón de turnos ya asignado. ¿Estás seguro que deseas modificarlo?
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Esto puede romper la consistencia del ciclo.
          </p>
          
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-300 mb-2">
              <strong>{guardiaNombre}</strong> - Día {diaNumero}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Actual:</span>
                <span className={`text-sm font-medium ${estadoActualInfo.color}`}>
                  {estadoActualInfo.text}
                </span>
              </div>
              <div className="text-gray-500">→</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Nuevo:</span>
                <span className={`text-sm font-medium ${nuevoEstadoInfo.color}`}>
                  {nuevoEstadoInfo.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700">
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-yellow-600 hover:bg-yellow-700">
            Modificar de todas formas
          </Button>
        </div>
      </motion.div>
    </div>
  );
};



// Modal para confirmar eliminación de pauta
const EliminarPautaModal = ({ isOpen, onClose, onConfirm, guardiaNombre }: EliminarPautaModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-900/20">
            <Trash2 className="h-5 w-5 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">¿Eliminar pauta del guardia?</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-2">
            Esta acción eliminará toda la pauta de <strong className="text-white">{guardiaNombre}</strong> en el mes actual.
          </p>
          <p className="text-sm text-gray-400">
            Se borrarán todos los valores (T, L, PPC) y la fila quedará completamente vacía.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700">
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700">
            Eliminar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};



// Componente KPI Box (igual que en guardias)
const KPIBox = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  trend = null 
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color?: string;
  trend?: { value: number; isPositive: boolean } | null;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="h-full">
      <CardContent className="p-3 md:p-6 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground min-h-[1.5rem] flex items-center">{title}</p>
            <p className="text-lg md:text-2xl font-bold">{value}</p>
            {trend && (
              <p className={`text-xs md:text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          <div className={`p-2 md:p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex-shrink-0 ml-3`}>
            <Icon className={`h-4 w-4 md:h-6 md:w-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Componente para renderizar el estado del día con edición interactiva
const DiaCell = ({ 
  estado, 
  onClick, 
  onRightClick,
  guardiaNombre,
  diaNumero,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  diaSemana,
  esFeriado
}: { 
  estado: string; 
  onClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  guardiaNombre: string;
  diaNumero: number;
  isHovered: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  diaSemana?: string;
  esFeriado?: boolean;
}) => {
  // Permitir clic en todas las celdas - remover restricción de patrón asignado
  const getEstadoDisplay = () => {
    // Normalizar estados antiguos a nuevos
    let estadoNormalizado = estado;
    if (estado === "T") estadoNormalizado = "TRABAJA";
    if (estado === "L") estadoNormalizado = "LIBRE";
    
    switch (estadoNormalizado) {
      case "TRABAJA":
        return { 
          icon: "🟩", 
          text: "T", 
          className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300",
          tooltip: "Trabajando"
        };
      case "LIBRE":
        return { 
          icon: "⚪️", 
          text: "L", 
          className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300",
          tooltip: "Libre"
        };
      default:
        return { 
          icon: "⬜️", 
          text: "", 
          className: "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-600 border-gray-200",
          tooltip: "Vacío"
        };
    }
  };

  const { icon, text, className, tooltip } = getEstadoDisplay();

  // Determinar si es fin de semana o feriado
  const esFinDeSemana = diaSemana === 'sáb' || diaSemana === 'dom';
  const esDiaEspecial = esFinDeSemana || esFeriado;
  
  // Clases adicionales para días especiales
  const clasesEspeciales = esDiaEspecial ? 'ring-1 ring-orange-300 dark:ring-orange-600' : '';
  const clasesFeriado = esFeriado ? 'bg-orange-50 dark:bg-orange-900/20' : '';
  const clasesFinDeSemana = esFinDeSemana ? 'bg-yellow-50 dark:bg-yellow-900/20' : '';

  return (
    <TableCell 
      className={`text-center transition-all duration-200 p-0 border-l-0 border-r-0 ${className} ${clasesEspeciales} ${clasesFeriado} ${clasesFinDeSemana} cursor-pointer ${
        isHovered ? 'ring-2 ring-blue-300 dark:ring-blue-600 scale-105' : ''
      }`}
      onClick={onClick}
      onContextMenu={onRightClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={`${guardiaNombre} - Día ${diaNumero} (${diaSemana || ''})${esFeriado ? ' - FERIADO' : ''}: ${tooltip}`}
    >
      <div className="flex flex-col items-center justify-center min-h-[2.5rem] py-1 relative group">
        {/* Día de la semana */}
        {diaSemana && (
          <span className={`text-xs font-medium leading-none mb-1 ${
            esFeriado ? 'text-orange-600 dark:text-orange-400' : 
            esFinDeSemana ? 'text-yellow-600 dark:text-yellow-400' : 
            'text-gray-500 dark:text-gray-400'
          }`}>
            {diaSemana}
          </span>
        )}
        
        <span className="text-sm leading-none">{icon}</span>
        {text && <span className="text-xs font-medium leading-none mt-0.5">{text}</span>}
        
        {/* Tooltip mejorado */}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg z-10 whitespace-nowrap">
            {guardiaNombre} - Día {diaNumero} ({diaSemana || ''})
            {esFeriado && <div className="text-orange-300">FERIADO</div>}
            <div className="text-center">{tooltip}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    </TableCell>
  );
};

export default function PautaMensualPage() {
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstalacion, setSelectedInstalacion] = useState<string>("");
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAnio, setSelectedAnio] = useState<string>("");
  const [showPauta, setShowPauta] = useState(false);
  const [pautaData, setPautaData] = useState<PautaGuardia[]>([]);
  const [diasDelMes, setDiasDelMes] = useState<number[]>([]);
  const [diasSemana, setDiasSemana] = useState<{dia: number, diaSemana: string, esFeriado: boolean}[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{guardiaIndex: number, diaIndex: number} | null>(null);
  const [autocompletadoModal, setAutocompletadoModal] = useState<{
    isOpen: boolean;
    guardiaIndex: number;
    diaIndex: number;
    diaSeleccionado: number;
    diaSemanaSeleccionado: string;
  }>({ isOpen: false, guardiaIndex: 0, diaIndex: 0, diaSeleccionado: 1, diaSemanaSeleccionado: '' });

  const [eliminarModal, setEliminarModal] = useState<{
    isOpen: boolean;
    guardiaIndex: number;
  }>({ isOpen: false, guardiaIndex: 0 });

  const [modificarPautaModal, setModificarPautaModal] = useState<{
    isOpen: boolean;
    guardiaIndex: number;
    diaIndex: number;
    nuevoEstado: string;
  }>({ isOpen: false, guardiaIndex: 0, diaIndex: 0, nuevoEstado: '' });

  // Estados para guardado
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);





  // Obtener año actual
  const anioActual = new Date().getFullYear();
  const anios = [anioActual - 1, anioActual, anioActual + 1];

  // Meses del año
  const meses = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ];

  // Estados para KPIs
  const [kpis, setKpis] = useState({
    totalTurnos: 0,
    turnosAsignados: 0,
    turnosPendientes: 0,
    eficiencia: 0
  });

  // Cargar instalaciones al montar el componente
  useEffect(() => {
    const cargarInstalaciones = async () => {
      try {
        const data = await obtenerInstalaciones();
        setInstalaciones(data);
        
        // Simular KPIs para la pauta mensual
        setKpis({
          totalTurnos: 120,
          turnosAsignados: 85,
          turnosPendientes: 35,
          eficiencia: 71
        });
      } catch (error) {
        console.error("Error al cargar instalaciones:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarInstalaciones();
  }, []);

  // Función para generar datos simulados de pauta
  const generarDatosSimulados = (mes: number, anio: number) => {
    const diasEnMes = dayjs(`${anio}-${mes.toString().padStart(2, '0')}-01`).daysInMonth();
    const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);
    setDiasDelMes(dias);

    // Generar información de días de la semana y feriados
    const diasSemanaInfo = Array.from({ length: diasEnMes }, (_, i) => {
      const fecha = new Date(anio, mes - 1, i + 1);
      const diaSemana = fecha.toLocaleDateString('es-CL', { weekday: 'short' });
      const esFeriadoDia = esFeriado(fecha);
      return {
        dia: i + 1,
        diaSemana: diaSemana,
        esFeriado: esFeriadoDia
      };
    });
    setDiasSemana(diasSemanaInfo);

    // Datos simulados de guardias con IDs
    const datosSimulados: (PautaGuardia & { id?: string })[] = [
      {
        id: "guardia-1",
        nombre: "Juan Soto",
        rol: "D 4x4x12 - 08:00 - 20:00",
        dias: Array.from({ length: diasEnMes }, () => "")
      },
      {
        id: "guardia-2",
        nombre: "María González",
        rol: "N 4x4x12 - 20:00 - 08:00",
        dias: Array.from({ length: diasEnMes }, () => "")
      },
      {
        id: "guardia-3",
        nombre: "Carlos Rodríguez",
        rol: "D 5x2x8 - 08:00 - 16:00",
        dias: Array.from({ length: diasEnMes }, () => "")
      },
      {
        id: "guardia-4",
        nombre: "Ana Silva",
        rol: "N 5x2x8 - 16:00 - 00:00",
        dias: Array.from({ length: diasEnMes }, () => "")
      }
    ];

    setPautaData(datosSimulados);
  };

  // Función para generar pauta
  const generarPauta = () => {
    if (!selectedInstalacion || !selectedMes || !selectedAnio) {
      alert("Por favor selecciona todos los filtros");
      return;
    }

    const mes = parseInt(selectedMes);
    const anio = parseInt(selectedAnio);
    
    generarDatosSimulados(mes, anio);
    setShowPauta(true);
    
    console.log("✅ Tabla de pauta mensual generada exitosamente");
  };

  // Función para cambiar el estado de un día
  const cambiarEstadoDia = (guardiaIndex: number, diaIndex: number) => {
    const estadoActual = pautaData[guardiaIndex].dias[diaIndex];
    
    // Convertir estados antiguos a nuevos estados
    let estadoNormalizado = estadoActual;
    if (estadoActual === "T" || estadoActual === "TRABAJA") {
      estadoNormalizado = "TRABAJA";
    } else if (estadoActual === "L" || estadoActual === "LIBRE") {
      estadoNormalizado = "LIBRE";
    } else {
      estadoNormalizado = "";
    }
    
    // Alternar entre TRABAJA y LIBRE
    const nuevoEstado = estadoNormalizado === "TRABAJA" ? "LIBRE" : "TRABAJA";
    
    const nuevosDatos = [...pautaData];
    nuevosDatos[guardiaIndex].dias[diaIndex] = nuevoEstado;
    setPautaData(nuevosDatos);
    actualizarKPIs(nuevosDatos);
    
    console.log("Edición de pauta mensual actualizada exitosamente");
  };



  // Función para confirmar modificación de pauta
  const confirmarModificacionPauta = () => {
    const nuevosDatos = [...pautaData];
    const { guardiaIndex, diaIndex, nuevoEstado } = modificarPautaModal;
    
    nuevosDatos[guardiaIndex].dias[diaIndex] = nuevoEstado;
    setPautaData(nuevosDatos);
    actualizarKPIs(nuevosDatos);
    
    setModificarPautaModal({ isOpen: false, guardiaIndex: 0, diaIndex: 0, nuevoEstado: '' });
  };

  // Función para manejar clic derecho
  const handleRightClick = (e: React.MouseEvent, guardiaIndex: number, diaIndex: number) => {
    e.preventDefault();
    const diaInfo = diasSemana[diaIndex];
    setAutocompletadoModal({
      isOpen: true,
      guardiaIndex,
      diaIndex,
      diaSeleccionado: diaIndex + 1,
      diaSemanaSeleccionado: diaInfo?.diaSemana || ''
    });
  };

  // Función para autocompletar pauta
  const autocompletarPauta = (diaInicio: number) => {
    // Aplicar autocompletado directamente sin verificar patrón existente
    aplicarAutocompletado(diaInicio);
  };

  // Función para aplicar el autocompletado
  const aplicarAutocompletado = (diaInicio: number) => {
    const nuevosDatos = [...pautaData];
    const { guardiaIndex, diaSeleccionado } = autocompletadoModal;
    
    // Extraer el tipo de turno del rol de la guardia
    const extraerTipoTurno = (rol: string): string => {
      if (rol.includes("4x4")) return "4x4";
      if (rol.includes("5x2")) return "5x2";
      if (rol.includes("7x7")) return "7x7";
      if (rol.includes("6x1")) return "6x1";
      return "4x4"; // Por defecto
    };
    
    const tipoTurno = extraerTipoTurno(pautaData[guardiaIndex].rol);
    
    // Definir patrones de turnos
    const patrones = {
      "4x4": { trabajo: 4, libre: 4 },
      "5x2": { trabajo: 5, libre: 2 },
      "7x7": { trabajo: 7, libre: 7 },
      "6x1": { trabajo: 6, libre: 1 }
    };
    
    const patron = patrones[tipoTurno as keyof typeof patrones];
    const cicloCompleto = patron.trabajo + patron.libre;
    
    // LÓGICA CORREGIDA: Solo aplicar patrón desde el día seleccionado hacia adelante
    // NO borrar días anteriores
    for (let i = 0; i < nuevosDatos[guardiaIndex].dias.length; i++) {
      // Solo procesar días desde el día seleccionado hacia adelante
      if (i < diaSeleccionado - 1) {
        continue; // Saltar días anteriores al seleccionado
      }
      
      // Calcular la diferencia desde el día seleccionado
      const diferenciaDesdeSeleccionado = i - (diaSeleccionado - 1);
      
      // Calcular qué día del ciclo corresponde
      const diaDelCiclo = (diaInicio + diferenciaDesdeSeleccionado - 1) % cicloCompleto;
      
      // Para 4x4: días 0,1,2,3 son trabajo, días 4,5,6,7 son libre
      const esDiaTrabajo = diaDelCiclo < patron.trabajo;
      
      // Sobrescribir directamente sin confirmación
      nuevosDatos[guardiaIndex].dias[i] = esDiaTrabajo ? "T" : "L";
    }
    
    setPautaData(nuevosDatos);
    setAutocompletadoModal({ isOpen: false, guardiaIndex: 0, diaIndex: 0, diaSeleccionado: 1, diaSemanaSeleccionado: '' });
    actualizarKPIs(nuevosDatos);
    
    console.log("✅ Patrón aplicado solo hacia adelante - días anteriores preservados");
  };



  // Función para actualizar KPIs
  const actualizarKPIs = (datos: PautaGuardia[]) => {
    let totalTurnos = 0;
    let turnosAsignados = 0;
    let turnosPendientes = 0;

    datos.forEach(guardia => {
      guardia.dias.forEach(dia => {
        totalTurnos++;
        if (dia === "T") turnosAsignados++;
        if (dia === "PPC") turnosPendientes++;
      });
    });

    const eficiencia = totalTurnos > 0 ? Math.round((turnosAsignados / totalTurnos) * 100) : 0;

    setKpis({
      totalTurnos,
      turnosAsignados,
      turnosPendientes,
      eficiencia
    });
  };

  // Función para exportar a Excel
  const exportarExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Preparar datos para Excel
    const datosExcel = [
      // Encabezado con información de la pauta
      [`Pauta Mensual - ${instalaciones.find(i => i.id === selectedInstalacion)?.nombre}`],
      [`Mes: ${meses.find(m => m.value === selectedMes)?.label} ${selectedAnio}`],
      [],
      // Encabezados de columnas
      ["Guardia", "Rol", ...diasDelMes.map(dia => `Día ${dia}`)]
    ];

    // Agregar datos de cada guardia
    pautaData.forEach(guardia => {
      const fila = [
        guardia.nombre,
        guardia.rol,
        ...guardia.dias.map(estado => {
          switch (estado) {
            case "T": return "Trabajando";
            case "L": return "Libre";
            case "PPC": return "PPC";
            case "LIC": return "Licencia";
            case "VAC": return "Vacaciones";
            case "PGS": return "Permiso con goce";
            case "PSS": return "Permiso sin goce";
            default: return "";
          }
        })
      ];
      datosExcel.push(fila);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(datosExcel);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pauta Mensual");
    
    // Descargar archivo
    XLSX.writeFile(workbook, `pauta-mensual-${selectedMes}-${selectedAnio}.xlsx`);
  };

  // Función para exportar a PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text(`Pauta Mensual - ${instalaciones.find(i => i.id === selectedInstalacion)?.nombre}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`${meses.find(m => m.value === selectedMes)?.label} ${selectedAnio}`, 14, 30);
    
    // Preparar datos para la tabla
    const datosTabla = pautaData.map(guardia => {
      const fila = [
        guardia.nombre,
        guardia.rol,
        ...guardia.dias.map(estado => {
          switch (estado) {
            case "T": return "T";
            case "L": return "L";
            case "PPC": return "PPC";
            case "LIC": return "LIC";
            case "VAC": return "VAC";
            case "PGS": return "PGS";
            case "PSS": return "PSS";
            default: return "";
          }
        })
      ];
      return fila;
    });

    // Encabezados
    const headers = ["Guardia", "Rol", ...diasDelMes.map(dia => `${dia}`)];
    
    // Crear tabla
    autoTable(doc, {
      head: [headers],
      body: datosTabla,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 }
      }
    });
    
    // Descargar PDF
    doc.save(`pauta-mensual-${selectedMes}-${selectedAnio}.pdf`);
  };

  // Función para eliminar pauta de un guardia específico
  const eliminarPautaGuardia = () => {
    const nuevosDatos = [...pautaData];
    const { guardiaIndex } = eliminarModal;
    
    // Limpiar todos los días del guardia
    nuevosDatos[guardiaIndex].dias = nuevosDatos[guardiaIndex].dias.map(() => "");
    
    setPautaData(nuevosDatos);
    setEliminarModal({ isOpen: false, guardiaIndex: 0 });
    actualizarKPIs(nuevosDatos);
  };

  // Función para limpiar pauta
  const limpiarPauta = () => {
    if (confirm("¿Estás seguro de que quieres limpiar toda la pauta?")) {
      const nuevosDatos = pautaData.map(guardia => ({
        ...guardia,
        dias: guardia.dias.map(() => "")
      }));
      setPautaData(nuevosDatos);
      actualizarKPIs(nuevosDatos);
    }
  };

  // Función para guardar la pauta mensual en la base de datos
  const guardarPauta = async () => {
    if (!selectedInstalacion || !selectedMes || !selectedAnio) {
      alert("Por favor selecciona todos los filtros");
      return;
    }

    setGuardando(true);
    setMensajeGuardado(null);

    try {
      // Preparar datos para guardar
      const pautaParaGuardar = [];
      
      for (let guardiaIndex = 0; guardiaIndex < pautaData.length; guardiaIndex++) {
        const guardia = pautaData[guardiaIndex];
        
        // Obtener el ID del guardia
        const guardiaId = guardia.id || `guardia-${guardiaIndex + 1}`;
        
        for (let diaIndex = 0; diaIndex < guardia.dias.length; diaIndex++) {
          const estado = guardia.dias[diaIndex];
          
          if (estado) { // Solo guardar días que tengan estado
            let estadoNormalizado = '';
            switch (estado) {
              case 'T':
                estadoNormalizado = 'trabajado';
                break;
              case 'L':
                estadoNormalizado = 'libre';
                break;
              case 'P':
                estadoNormalizado = 'permiso';
                break;
              default:
                continue; // Saltar estados no reconocidos
            }
            
            pautaParaGuardar.push({
              guardia_id: guardiaId,
              dia: diaIndex + 1,
              estado: estadoNormalizado
            });
          }
        }
      }

      if (pautaParaGuardar.length === 0) {
        setMensajeGuardado("No hay datos para guardar");
        return;
      }

      const resultado = await guardarPautaMensual({
        instalacion_id: selectedInstalacion,
        anio: parseInt(selectedAnio),
        mes: parseInt(selectedMes),
        pauta: pautaParaGuardar
      });

      setMensajeGuardado(`✅ Pauta guardada exitosamente: ${resultado.data.turnosGuardados} turnos`);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setMensajeGuardado(null);
      }, 3000);

    } catch (error) {
      console.error('Error guardando pauta:', error);
      setMensajeGuardado(`❌ Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => {
        setMensajeGuardado(null);
      }, 5000);
    } finally {
      setGuardando(false);
    }
  };

  // Establecer valores por defecto
  useEffect(() => {
    if (!selectedMes) {
      setSelectedMes((new Date().getMonth() + 1).toString());
    }
    if (!selectedAnio) {
      setSelectedAnio(anioActual.toString());
    }
  }, [selectedMes, selectedAnio, anioActual]);

  console.log("✅ Selector visual de día del ciclo implementado y lógica de eliminación funcional");

  return (
    <div className="p-2 md:p-4 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
        <div className="p-2 md:p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
          <Calendar className="h-5 w-5 md:h-6 md:w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Pauta Mensual</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Planificación y programación mensual de turnos</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPIBox
          title="Total Turnos"
          value={kpis.totalTurnos}
          icon={Clock}
          color="blue"
        />
        <KPIBox
          title="Turnos Asignados"
          value={kpis.turnosAsignados}
          icon={Users}
          color="green"
        />
        <KPIBox
          title="Turnos Pendientes"
          value={kpis.turnosPendientes}
          icon={Clock}
          color="orange"
        />
        <KPIBox
          title="Eficiencia"
          value={`${kpis.eficiencia}%`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Filtros y Acciones */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Selector de Instalación */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Instalación</label>
              <Select value={selectedInstalacion} onValueChange={setSelectedInstalacion}>
                <SelectTrigger className="w-full sm:w-56 h-8 text-sm">
                  <SelectValue placeholder="Seleccionar instalación" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <SelectItem value="loading" disabled>Cargando...</SelectItem>
                  ) : (
                    instalaciones
                      .filter(inst => inst.estado === "Activo")
                      .map((instalacion) => (
                        <SelectItem key={instalacion.id} value={instalacion.id}>
                          {instalacion.nombre}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Mes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mes</label>
              <Select value={selectedMes} onValueChange={setSelectedMes}>
                <SelectTrigger className="w-full sm:w-40 h-8 text-sm">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Año */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Año</label>
              <Select value={selectedAnio} onValueChange={setSelectedAnio}>
                <SelectTrigger className="w-full sm:w-24 h-8 text-sm">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {anios.map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={generarPauta}
            className="flex items-center space-x-2 w-full sm:w-auto h-8 text-sm"
            disabled={!selectedInstalacion || !selectedMes || !selectedAnio}
          >
            <Play className="h-3 w-3" />
            <span>Generar Pauta</span>
          </Button>
        </div>
      </div>

      {/* Contenido principal */}
      <Card className="mx-0">
        <CardContent className="p-0">
          {showPauta ? (
            <div className="space-y-4">
              {/* Encabezado con datos seleccionados y botones de exportación */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium">Instalación:</span>
                    <span className="text-xs text-blue-600 font-semibold">
                      {instalaciones.find(i => i.id === selectedInstalacion)?.nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium">Mes:</span>
                    <span className="text-xs text-green-600 font-semibold">
                      {meses.find(m => m.value === selectedMes)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-medium">Año:</span>
                    <span className="text-xs text-purple-600 font-semibold">{selectedAnio}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>🟩 T (Trabajando)</span>
                    <span>⚪️ L (Libre)</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limpiarPauta}
                      className="h-7 text-xs"
                      title="Limpiar pauta"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportarExcel}
                      className="h-7 text-xs"
                      title="Descargar Excel"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportarPDF}
                      className="h-7 text-xs"
                      title="Descargar PDF"
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={guardarPauta}
                      disabled={guardando}
                      className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                      title="Guardar pauta en base de datos"
                    >
                      <Save className="h-3 w-3" />
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Instrucciones:</p>
                    <p>• <strong>Clic izquierdo:</strong> Alternar entre Trabajando y Libre</p>
                    <p>• <strong>Clic derecho:</strong> Autocompletar patrón de turnos desde esa posición</p>
                    <p>• <strong>Hover:</strong> Ver detalles del guardia y día</p>
                    <p>• <strong>Patrón:</strong> Se aplica completamente (hacia atrás y adelante)</p>
                  </div>
                </div>
              </div>

              {/* Mensaje de estado del guardado */}
              {mensajeGuardado && (
                <div className={`px-3 py-2 border-l-4 ${
                  mensajeGuardado.includes('✅') 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-400' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-400'
                }`}>
                  <div className="flex items-start gap-2">
                    <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                      mensajeGuardado.includes('✅') 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`} />
                    <div className={`text-xs ${
                      mensajeGuardado.includes('✅') 
                        ? 'text-green-800 dark:text-green-200' 
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {mensajeGuardado}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabla de pauta */}
              <div className="overflow-x-auto">
                <Table className="border-collapse w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead className="font-semibold text-left p-3 border-r-0" style={{width: '1%', whiteSpace: 'nowrap'}}>Guardia</TableHead>
                      {diasDelMes.map((dia) => {
                        const diaInfo = diasSemana[dia - 1];
                        const esFinDeSemana = diaInfo?.diaSemana === 'sáb' || diaInfo?.diaSemana === 'dom';
                        const esFeriado = diaInfo?.esFeriado;
                        const clasesEspeciales = esFeriado ? 'bg-orange-100 dark:bg-orange-900/30' : 
                                               esFinDeSemana ? 'bg-yellow-100 dark:bg-yellow-900/30' : '';
                        
                        return (
                          <TableHead key={dia} className={`font-semibold text-center w-[32px] p-2 border-l-0 ${clasesEspeciales}`}>
                            <div className="text-sm font-bold">{dia}</div>
                            {diaInfo?.diaSemana && (
                              <div className={`text-xs mt-1 ${
                                esFeriado ? 'text-orange-600 dark:text-orange-400' : 
                                esFinDeSemana ? 'text-yellow-600 dark:text-yellow-400' : 
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
                    {pautaData.map((guardia, guardiaIndex) => (
                      <TableRow key={guardiaIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800 group">
                        <TableCell className="p-3 border-r-0 whitespace-nowrap relative">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{guardia.nombre}</div>
                            <div className="text-xs text-muted-foreground leading-tight">{guardia.rol}</div>
                          </div>
                          
                          {/* Botón de eliminar pauta - aparece al hacer hover */}
                          <button
                            onClick={() => setEliminarModal({ isOpen: true, guardiaIndex })}
                            className="absolute top-2 right-2 p-1 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            title="Eliminar pauta de este guardia"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TableCell>
                        {guardia.dias.map((estado, diaIndex) => {
                          const diaInfo = diasSemana[diaIndex];
                          return (
                            <DiaCell
                              key={diaIndex}
                              estado={estado}
                              onClick={() => cambiarEstadoDia(guardiaIndex, diaIndex)}
                              onRightClick={(e) => handleRightClick(e, guardiaIndex, diaIndex)}
                              guardiaNombre={guardia.nombre}
                              diaNumero={diaIndex + 1}
                              isHovered={hoveredCell?.guardiaIndex === guardiaIndex && hoveredCell?.diaIndex === diaIndex}
                              onMouseEnter={() => setHoveredCell({ guardiaIndex, diaIndex })}
                              onMouseLeave={() => setHoveredCell(null)}
                              diaSemana={diaInfo?.diaSemana}
                              esFeriado={diaInfo?.esFeriado}
                            />
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 p-4">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-medium">Selecciona los filtros</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Elige una instalación, mes y año para generar la pauta mensual de turnos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Modal de autocompletado */}
      <AutocompletadoModal
        isOpen={autocompletadoModal.isOpen}
        onClose={() => setAutocompletadoModal({ isOpen: false, guardiaIndex: 0, diaIndex: 0, diaSeleccionado: 1, diaSemanaSeleccionado: '' })}
        onConfirm={autocompletarPauta}
        guardiaIndex={autocompletadoModal.guardiaIndex}
        diaIndex={autocompletadoModal.diaIndex}
        diasDisponibles={diasDelMes.length}
        turnoGuardia={pautaData[autocompletadoModal.guardiaIndex]?.rol || ""}
        diaSeleccionado={autocompletadoModal.diaSeleccionado}
        diaSemanaSeleccionado={autocompletadoModal.diaSemanaSeleccionado}
      />

      {/* Modal de eliminación */}
      <EliminarPautaModal
        isOpen={eliminarModal.isOpen}
        onClose={() => setEliminarModal({ isOpen: false, guardiaIndex: 0 })}
        onConfirm={eliminarPautaGuardia}
        guardiaNombre={pautaData[eliminarModal.guardiaIndex]?.nombre || ""}
      />

      {/* Modal de modificación de pauta */}
      <ModificarPautaModal
        isOpen={modificarPautaModal.isOpen}
        onClose={() => setModificarPautaModal({ isOpen: false, guardiaIndex: 0, diaIndex: 0, nuevoEstado: '' })}
        onConfirm={confirmarModificacionPauta}
        guardiaNombre={pautaData[modificarPautaModal.guardiaIndex]?.nombre || ""}
        diaNumero={modificarPautaModal.diaIndex + 1}
        estadoActual={pautaData[modificarPautaModal.guardiaIndex]?.dias[modificarPautaModal.diaIndex] || ""}
        nuevoEstado={modificarPautaModal.nuevoEstado}
      />


    </div>
  );
} 