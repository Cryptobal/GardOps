"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Trash2, Info } from "lucide-react";

interface PautaGuardia {
  id_guardia: string;
  nombre: string;
  rol_servicio: {
    patron_turno: string;
  };
  dias: string[];
}

interface PautaTableProps {
  pautaData: PautaGuardia[];
  diasDelMes: number[];
  diasSemana: {dia: number, diaSemana: string, esFeriado: boolean}[];
  onUpdatePauta: (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => void;
  onDeleteGuardia: (guardiaIndex: number) => void;
}

interface ModalAutocompletarPautaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (diaInicio: number) => void;
  id_guardia: string;
  patron_turno: string;
  diaSeleccionado: number;
  diaSemanaSeleccionado: string;
}

// Modal para autocompletar pauta
const ModalAutocompletarPauta = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  id_guardia, 
  patron_turno, 
  diaSeleccionado, 
  diaSemanaSeleccionado 
}: ModalAutocompletarPautaProps) => {
  const [diaInicio, setDiaInicio] = useState(1);

  // Extraer el tipo de turno del patrón
  const extraerTipoTurno = (patron: string): string => {
    if (patron.includes("4x4")) return "4x4";
    if (patron.includes("5x2")) return "5x2";
    if (patron.includes("7x7")) return "7x7";
    if (patron.includes("6x1")) return "6x1";
    return "4x4"; // Por defecto
  };

  const tipoTurno = extraerTipoTurno(patron_turno);
  
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
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[500px] max-w-[90vw] border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Autocompletar Pauta</h3>
        
        <div className="space-y-4">
          {/* Información del patrón */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">Patrón: {tipoTurno}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{patron.descripcion}</p>
              </div>
            </div>
          </div>

          {/* Información del día seleccionado */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Día seleccionado:</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mb-1">
                {diaSemanaSeleccionado} {diaSeleccionado}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                El patrón comenzará desde este día hacia adelante
              </p>
            </div>
          </div>

          {/* Selector visual del patrón */}
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
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
                        ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 scale-110' 
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
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Clic en un bloque para seleccionar el punto de inicio del patrón
            </p>
          </div>

          {/* Información del patrón */}
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
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
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
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

// Componente para renderizar el estado del día
const DiaCell = ({ 
  estado, 
  onClick, 
  onRightClick,
  guardiaNombre,
  diaNumero,
  diaSemana,
  esFeriado
}: { 
  estado: string; 
  onClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  guardiaNombre: string;
  diaNumero: number;
  diaSemana?: string;
  esFeriado?: boolean;
}) => {
  const getEstadoDisplay = () => {
    switch (estado) {
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
      className={`text-center transition-all duration-200 p-0 border-l-0 border-r-0 ${className} ${clasesEspeciales} ${clasesFeriado} ${clasesFinDeSemana} cursor-pointer hover:scale-105`}
      onClick={onClick}
      onContextMenu={onRightClick}
      title={`${guardiaNombre} - Día ${diaNumero} (${diaSemana || ''})${esFeriado ? ' - FERIADO' : ''}: ${tooltip}`}
    >
      <div className="flex flex-col items-center justify-center min-h-[2.5rem] py-1 relative">
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
      </div>
    </TableCell>
  );
};

export default function PautaTable({ 
  pautaData, 
  diasDelMes, 
  diasSemana, 
  onUpdatePauta, 
  onDeleteGuardia 
}: PautaTableProps) {
  const [autocompletadoModal, setAutocompletadoModal] = useState<{
    isOpen: boolean;
    guardiaIndex: number;
    diaIndex: number;
    diaSeleccionado: number;
    diaSemanaSeleccionado: string;
  }>({ isOpen: false, guardiaIndex: 0, diaIndex: 0, diaSeleccionado: 1, diaSemanaSeleccionado: '' });

  // Función para cambiar el estado de un día (click izquierdo)
  const cambiarEstadoDia = (guardiaIndex: number, diaIndex: number) => {
    const estadoActual = pautaData[guardiaIndex].dias[diaIndex];
    
    // Alternar entre TRABAJA y LIBRE
    const nuevoEstado = estadoActual === "TRABAJA" ? "LIBRE" : "TRABAJA";
    
    onUpdatePauta(guardiaIndex, diaIndex, nuevoEstado);
    console.log("Edición de pauta mensual actualizada exitosamente");
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
    const { guardiaIndex, diaSeleccionado } = autocompletadoModal;
    const guardia = pautaData[guardiaIndex];
    
    // Extraer el tipo de turno del patrón
    const extraerTipoTurno = (patron: string): string => {
      if (patron.includes("4x4")) return "4x4";
      if (patron.includes("5x2")) return "5x2";
      if (patron.includes("7x7")) return "7x7";
      if (patron.includes("6x1")) return "6x1";
      return "4x4"; // Por defecto
    };
    
    const tipoTurno = extraerTipoTurno(guardia.rol_servicio.patron_turno);
    
    // Definir patrones de turnos
    const patrones = {
      "4x4": { trabajo: 4, libre: 4 },
      "5x2": { trabajo: 5, libre: 2 },
      "7x7": { trabajo: 7, libre: 7 },
      "6x1": { trabajo: 6, libre: 1 }
    };
    
    const patron = patrones[tipoTurno as keyof typeof patrones];
    const cicloCompleto = patron.trabajo + patron.libre;
    
    // Aplicar patrón solo desde el día seleccionado hacia adelante
    for (let i = 0; i < guardia.dias.length; i++) {
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
      
      // Aplicar el nuevo estado
      onUpdatePauta(guardiaIndex, i, esDiaTrabajo ? "TRABAJA" : "LIBRE");
    }
    
    setAutocompletadoModal({ isOpen: false, guardiaIndex: 0, diaIndex: 0, diaSeleccionado: 1, diaSemanaSeleccionado: '' });
    console.log("Edición de pauta mensual actualizada exitosamente");
  };

  // Función para eliminar pauta de un guardia
  const eliminarPautaGuardia = (guardiaIndex: number) => {
    if (confirm(`¿Estás seguro de que quieres eliminar toda la pauta de ${pautaData[guardiaIndex].nombre}?`)) {
      onDeleteGuardia(guardiaIndex);
      console.log("Edición de pauta mensual actualizada exitosamente");
    }
  };

  return (
    <div className="space-y-4">
      {/* Leyenda simplificada */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-3">
        <span>🟩 = Trabajado</span>
        <span>⚪️ = Libre</span>
      </div>

      {/* Tabla de pauta */}
      <div className="overflow-x-auto">
        <Table className="border-collapse w-full">
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <TableHead className="font-semibold text-left p-3 border-r-0" style={{width: '1%', whiteSpace: 'nowrap'}}>
                Guardia
              </TableHead>
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
                  <div className="flex items-center gap-2">
                    {/* Ícono de eliminar */}
                    <button
                      onClick={() => eliminarPautaGuardia(guardiaIndex)}
                      className="p-1 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors duration-200"
                      title="Eliminar pauta de este guardia"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    
                    {/* Información del guardia */}
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{guardia.nombre}</div>
                      <div className="text-xs text-muted-foreground leading-tight">
                        {guardia.rol_servicio.patron_turno}
                      </div>
                    </div>
                  </div>
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

      {/* Modal de autocompletado */}
      <ModalAutocompletarPauta
        isOpen={autocompletadoModal.isOpen}
        onClose={() => setAutocompletadoModal({ isOpen: false, guardiaIndex: 0, diaIndex: 0, diaSeleccionado: 1, diaSemanaSeleccionado: '' })}
        onConfirm={autocompletarPauta}
        id_guardia={pautaData[autocompletadoModal.guardiaIndex]?.id_guardia || ""}
        patron_turno={pautaData[autocompletadoModal.guardiaIndex]?.rol_servicio.patron_turno || ""}
        diaSeleccionado={autocompletadoModal.diaSeleccionado}
        diaSemanaSeleccionado={autocompletadoModal.diaSemanaSeleccionado}
      />
    </div>
  );
} 