"use client";

import React, { useState, useEffect } from "react";
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
  TrendingUp
} from "lucide-react";
import { obtenerInstalaciones } from "../../lib/api/instalaciones";
import dayjs from "dayjs";

interface Instalacion {
  id: string;
  nombre: string;
  direccion: string;
  estado: string;
}

interface PautaGuardia {
  nombre: string;
  rol: string;
  dias: string[];
}

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

// Componente para renderizar el estado del día
const DiaCell = ({ estado, onClick }: { estado: string; onClick?: () => void }) => {
  const getEstadoDisplay = () => {
    switch (estado) {
      case "PPC":
        return { icon: "🟥", text: "PPC", className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" };
      case "OK":
        return { icon: "🟩", text: "OK", className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" };
      default:
        return { icon: "⬜️", text: "", className: "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-600" };
    }
  };

  const { icon, text, className } = getEstadoDisplay();

  return (
    <TableCell 
      className={`text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors p-0 border-l-0 border-r-0 ${className}`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center justify-center min-h-[2.5rem] py-1">
        <span className="text-sm leading-none">{icon}</span>
        {text && <span className="text-xs font-medium leading-none mt-0.5">{text}</span>}
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

    // Datos simulados de guardias
    const datosSimulados: PautaGuardia[] = [
      {
        nombre: "Juan Soto",
        rol: "D 4x4x12 - 08:00 - 20:00",
        dias: Array.from({ length: diasEnMes }, () => {
          const random = Math.random();
          if (random < 0.3) return "PPC";
          if (random < 0.7) return "OK";
          return "";
        })
      },
      {
        nombre: "María González",
        rol: "N 4x4x12 - 20:00 - 08:00",
        dias: Array.from({ length: diasEnMes }, () => {
          const random = Math.random();
          if (random < 0.2) return "PPC";
          if (random < 0.8) return "OK";
          return "";
        })
      },
      {
        nombre: "Carlos Rodríguez",
        rol: "D 5x2x8 - 08:00 - 16:00",
        dias: Array.from({ length: diasEnMes }, () => {
          const random = Math.random();
          if (random < 0.1) return "PPC";
          if (random < 0.6) return "OK";
          return "";
        })
      },
      {
        nombre: "Ana Silva",
        rol: "N 5x2x8 - 16:00 - 00:00",
        dias: Array.from({ length: diasEnMes }, () => {
          const random = Math.random();
          if (random < 0.25) return "PPC";
          if (random < 0.75) return "OK";
          return "";
        })
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
    const nuevosDatos = [...pautaData];
    const estados = ["", "PPC", "OK"];
    const estadoActual = nuevosDatos[guardiaIndex].dias[diaIndex];
    const estadoIndex = estados.indexOf(estadoActual);
    const nuevoEstado = estados[(estadoIndex + 1) % estados.length];
    
    nuevosDatos[guardiaIndex].dias[diaIndex] = nuevoEstado;
    setPautaData(nuevosDatos);
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

  console.log("✅ Página Pauta Mensual creada exitosamente");

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
              {/* Encabezado con datos seleccionados */}
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>🟩 Asignado</span>
                  <span>🟥 PPC</span>
                  <span>⬜️ Vacío</span>
                </div>
              </div>

              {/* Tabla de pauta */}
              <div className="overflow-x-auto">
                <Table className="border-collapse w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead className="font-semibold text-left p-3 border-r-0" style={{width: '1%', whiteSpace: 'nowrap'}}>Guardia</TableHead>
                      {diasDelMes.map((dia) => (
                        <TableHead key={dia} className="font-semibold text-center w-[32px] p-2 border-l-0">
                          <div className="text-sm font-bold">{dia}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pautaData.map((guardia, guardiaIndex) => (
                      <TableRow key={guardiaIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="p-3 border-r-0 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{guardia.nombre}</div>
                            <div className="text-xs text-muted-foreground leading-tight">{guardia.rol}</div>
                          </div>
                        </TableCell>
                        {guardia.dias.map((estado, diaIndex) => (
                          <DiaCell
                            key={diaIndex}
                            estado={estado}
                            onClick={() => cambiarEstadoDia(guardiaIndex, diaIndex)}
                          />
                        ))}
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
    </div>
  );
} 