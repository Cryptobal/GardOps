"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { 
  Calendar, 
  Building2, 
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Plus,
  Eye,
  FileText,
  AlertCircle,
  Loader2,
  Info,
  Shield,
  UserCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  X,
  Search
} from "lucide-react";
import { obtenerResumenPautasMensuales, crearPautaMensualAutomatica, verificarRolesServicio, eliminarPautaMensual } from "../../lib/api/pauta-mensual";
import { useToast } from "../../components/ui/toast";
import { useRouter } from "next/navigation";
import ConfirmDeleteModal from "../../components/ui/confirm-delete-modal";
import InstalacionCard from "./components/InstalacionCard";
import { useCan } from "@/lib/permissions";

interface RolServicio {
  id: string;
  nombre: string;
  cantidad_guardias: number;
  patron_turno?: string;
}

interface InstalacionConPauta {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  puestos_con_pauta: number;
}

interface InstalacionSinPauta {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  roles: RolServicio[];
  cantidad_guardias: number;
  cantidad_ppcs: number;
  puestos_sin_asignar: number;
  total_puestos: number;
}

interface ResumenPautas {
  instalaciones_con_pauta: InstalacionConPauta[];
  instalaciones_sin_pauta: InstalacionSinPauta[];
  progreso: number;
  total_instalaciones: number;
  instalaciones_con_pauta_count: number;
  mes: number;
  anio: number;
}

// Componente KPI Box optimizado para móviles (con clases estáticas para Tailwind)
const KPIBox = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  subtitle = ""
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color?: "blue" | "green" | "orange" | "purple";
  subtitle?: string;
}) => {
  const colorClassMap: Record<"blue" | "green" | "orange" | "purple", { bg: string; text: string }> = {
    blue: { bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400" },
    green: { bg: "bg-green-100 dark:bg-green-900/20", text: "text-green-600 dark:text-green-400" },
    orange: { bg: "bg-orange-100 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400" },
    purple: { bg: "bg-purple-100 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400" },
  };

  const colorClasses = colorClassMap[color] ?? colorClassMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full overflow-hidden">
        <CardContent className="p-3 sm:p-4 md:p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{title}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
              )}
            </div>
            <div className={`p-2 sm:p-2.5 md:p-3 rounded-full ${colorClasses.bg} flex-shrink-0 ml-2 sm:ml-3`}>
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${colorClasses.text}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function PautaMensualPage() {
  // Gate UI: requiere permiso para ver pautas
  const { allowed, loading: permLoading } = useCan('pautas.view');
  const router = useRouter();
  const { toast } = useToast();
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAnio, setSelectedAnio] = useState<string>("");
  const [isPeriodoOpen, setIsPeriodoOpen] = useState<boolean>(false);
  const [resumen, setResumen] = useState<ResumenPautas | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInstalacion, setLoadingInstalacion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Debug: Log del estado inicial
  useEffect(() => {
    devLogger.search(' Estado inicial - loading:', loading, 'selectedMes:', selectedMes, 'selectedAnio:', selectedAnio);
  }, [loading, selectedMes, selectedAnio]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    instalacionId: string | null;
    instalacionNombre: string | null;
  }>({
    isOpen: false,
    instalacionId: null,
    instalacionNombre: null
  });

  const [replicarModal, setReplicarModal] = useState<boolean>(false);
  const [replicarExpanded, setReplicarExpanded] = useState<boolean>(false);
  const [instalacionesDisponibles, setInstalacionesDisponibles] = useState<Array<{
    id: string;
    nombre: string;
    seleccionada: boolean;
  }>>([]);
  const [busquedaInstalacion, setBusquedaInstalacion] = useState<string>('');

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

  // Cargar resumen cuando cambia mes/año (solo si se permite)
  useEffect(() => {
    if (!allowed) return;
    if (selectedMes && selectedAnio) {
      cargarResumen();
    }
  }, [allowed, selectedMes, selectedAnio]);

  // Establecer valores por defecto
  useEffect(() => {
    if (!selectedMes) {
      setSelectedMes((new Date().getMonth() + 1).toString());
    }
    if (!selectedAnio) {
      setSelectedAnio(anioActual.toString());
    }
  }, [selectedMes, selectedAnio, anioActual]);

  const cargarResumen = async () => {
    if (!selectedMes || !selectedAnio) return;

    setLoading(true);
    setMensaje(null);

    try {
      const resultado = await obtenerResumenPautasMensuales(
        parseInt(selectedMes), 
        parseInt(selectedAnio)
      );
      setResumen(resultado);
    } catch (error) {
      logger.error('Error cargando resumen::', error);
      setMensaje(`❌ Error al cargar el resumen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const generarPautaAutomatica = async (instalacionId: string) => {
    if (!selectedMes || !selectedAnio) {
      toast.error('Por favor selecciona un mes y año', 'Error');
      return;
    }

    setLoadingInstalacion(instalacionId);
    setMensaje(null);

    try {
      // 1. PRIMERO: Verificar si tiene roles de servicio
      const verificacionRoles = await verificarRolesServicio(instalacionId);
      
      if (!verificacionRoles.tiene_roles) {
        toast.error(
          "¿Deseas ir a la instalación para crear un rol de servicio?",
          "Instalación sin rol de servicio"
        );
        
        // Mostrar confirmación con botón
        if (confirm("¿Deseas ir a la instalación para crear un rol de servicio?")) {
          router.push(`/instalaciones/${instalacionId}`);
        }
        return;
      }

      if (!verificacionRoles.puede_generar_pauta) {
        toast.error(
          verificacionRoles.mensaje,
          "No se puede generar pauta"
        );
        return;
      }

      // 2. SEGUNDO: Si tiene roles y puede generar pauta, redirigir a la página unificada
      router.push(`/pauta-mensual/${instalacionId}?mes=${selectedMes}&anio=${selectedAnio}`);

    } catch (error: any) {
      logger.error('Error verificando roles::', error);
      toast.error(
        error.message || 'Error al verificar roles de servicio',
        "Error"
      );
    } finally {
      setLoadingInstalacion(null);
    }
  };

  const verPauta = (instalacionId: string) => {
    // Navegar a la página unificada de pauta mensual
    router.push(`/pauta-mensual/${instalacionId}?mes=${selectedMes}&anio=${selectedAnio}`);
  };

  const abrirModalEliminar = (instalacionId: string, instalacionNombre: string) => {
    setDeleteModal({
      isOpen: true,
      instalacionId,
      instalacionNombre
    });
  };

  const cerrarModalEliminar = () => {
    setDeleteModal({
      isOpen: false,
      instalacionId: null,
      instalacionNombre: null
    });
  };

  const eliminarPauta = async () => {
    if (!deleteModal.instalacionId || !selectedMes || !selectedAnio) return;

    setLoadingInstalacion(deleteModal.instalacionId);
    
    try {
      await eliminarPautaMensual({
        instalacion_id: deleteModal.instalacionId,
        anio: parseInt(selectedAnio),
        mes: parseInt(selectedMes)
      });
      
      toast.success('La pauta mensual ha sido eliminada exitosamente', 'Pauta eliminada');
      
      // Recargar el resumen
      await cargarResumen();
      
    } catch (error) {
      logger.error('Error eliminando pauta::', error);
      toast.error('No se pudo eliminar la pauta mensual', 'Error');
    } finally {
      setLoadingInstalacion(null);
      cerrarModalEliminar();
    }
  };

  const porcentajeProgreso = resumen ? Math.round(resumen.progreso * 100) : 0;

  const abrirModalReplicar = async () => {
    logger.debug('🔍 abrirModalReplicar llamado');
    logger.debug('📅 selectedMes:', selectedMes, 'selectedAnio:', selectedAnio);
    
    if (!selectedMes || !selectedAnio) {
      toast.error('Por favor selecciona un mes y año primero', 'Error');
      return;
    }

    try {
      logger.debug('🌐 Llamando a API de instalaciones disponibles...');
      // Obtener instalaciones disponibles para replicar
      const response = await fetch(`/api/pauta-mensual/instalaciones-disponibles?anio=${selectedAnio}&mes=${selectedMes}`);
      logger.debug('📡 Respuesta de API:', response.status, response.ok);
      
      const data = await response.json();
      logger.debug('📊 Datos recibidos:', data);
      
      if (response.ok && data.instalaciones) {
        const instalaciones = data.instalaciones.map((inst: any) => ({
          id: inst.instalacion_id,
          nombre: inst.instalacion_nombre,
          seleccionada: true // Por defecto todas seleccionadas
        }));
        logger.debug('🏢 Instalaciones procesadas:', instalaciones);
        setInstalacionesDisponibles(instalaciones);
        setReplicarModal(true);
        logger.debug('✅ Modal abierto correctamente');
      } else {
        console.error('❌ Error en respuesta de API:', data);
        toast.error('Error al cargar instalaciones disponibles', 'Error');
      }
    } catch (error) {
      console.error('❌ Error cargando instalaciones:', error);
      toast.error('Error de conexión', 'Error');
    }
  };

  const cerrarModalReplicar = () => {
    setReplicarModal(false);
  };

  const replicarPautas = async () => {
    if (!selectedMes || !selectedAnio) {
      toast.error('Por favor selecciona un mes y año para replicar', 'Error');
      return;
    }

    // Obtener solo las instalaciones seleccionadas
    const instalacionesSeleccionadas = instalacionesDisponibles
      .filter(inst => inst.seleccionada)
      .map(inst => inst.id);

    if (instalacionesSeleccionadas.length === 0) {
      toast.error('Por favor selecciona al menos una instalación', 'Error');
      return;
    }

    setLoading(true);
    setMensaje(null);

    try {
      const response = await fetch('/api/pauta-mensual/replicar-mes-anterior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anio: parseInt(selectedAnio),
          mes: parseInt(selectedMes),
          instalaciones_ids: instalacionesSeleccionadas
        }),
      });

      const resultado = await response.json();

      if (response.ok && resultado.success) {
        toast.success(
          `✅ Pautas replicadas exitosamente: ${resultado.total_replicados} registros`,
          'Replicación completada'
        );
        
        // Recargar el resumen para mostrar el progreso actualizado
        await cargarResumen();
        
        // Cerrar el modal
        setReplicarModal(false);
      } else {
        toast.error(
          resultado.error || 'Error al replicar pautas',
          'Error en replicación'
        );
      }
    } catch (error: any) {
      logger.error('Error replicando pautas::', error);
      toast.error(
        'Error de conexión al replicar pautas',
        'Error de red'
      );
    } finally {
      setLoading(false);
    }
  };

  // Mensaje de confirmación en consola
  useEffect(() => {
    if (resumen) {
      logger.debug("✅ Pauta Mensual refactorizada y unificada con éxito");
    }
  }, [resumen]);

  // Bloqueos de render según permiso (después de declarar todos los hooks)
  if (permLoading) return null;
  if (!allowed) return (<div className="p-4 text-sm text-muted-foreground">Sin acceso</div>);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header optimizado para móviles */}
      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
        <div className="p-2 sm:p-2.5 md:p-3 rounded-full bg-orange-100 dark:bg-orange-900/20 flex-shrink-0">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Pauta Mensual</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">Gestión y planificación mensual de turnos</p>
        </div>
      </div>

      {/* Selector de Mes y Año - Mobile First con panel plegable */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3">
          <button
            type="button"
            onClick={() => setIsPeriodoOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2"
          >
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Seleccionar período
            </CardTitle>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="truncate">
                {(() => {
                  const mesLabel = meses.find((m) => m.value === selectedMes)?.label || "Mes";
                  return `${mesLabel} ${selectedAnio || new Date().getFullYear()}`;
                })()}
              </span>
              {isPeriodoOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>
        </CardHeader>
        <CardContent className="pt-0">
          <motion.div
            initial={false}
            animate={{ height: isPeriodoOpen ? "auto" : 0, opacity: isPeriodoOpen ? 1 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-xs sm:text-sm font-medium">Mes</label>
                <Select value={selectedMes} onValueChange={setSelectedMes}>
                  <SelectTrigger className="w-full">
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

              <div className="space-y-2 flex-1 sm:flex-none">
                <label className="text-xs sm:text-sm font-medium">Año</label>
                <Select value={selectedAnio} onValueChange={setSelectedAnio}>
                  <SelectTrigger className="w-full sm:w-32">
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
          </motion.div>
        </CardContent>
      </Card>

      {/* Sección de Período y Replicar Pautas - Completamente Colapsible */}
      {resumen && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            {/* Header con botón de colapsar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-medium">Período: {(() => {
                  const mesLabel = meses.find((m) => m.value === selectedMes)?.label || "Mes";
                  return `${mesLabel} ${selectedAnio || new Date().getFullYear()}`;
                })()}</h3>
              </div>
              <Button
                onClick={() => setReplicarExpanded(!replicarExpanded)}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                Replicar Pautas
                {replicarExpanded ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </div>

            {/* Contenido colapsible - Toda la sección */}
            {replicarExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Selectores de Período */}
                <div className="flex gap-2">
                  <Select value={selectedMes} onValueChange={setSelectedMes}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedAnio} onValueChange={setSelectedAnio}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
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

                {/* Botón de Replicar Pautas */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Replica del mes anterior manteniendo series
                  </p>
                  <Button
                    onClick={() => {
                      logger.debug('🖱️ Botón replicar clickeado, loading:', loading);
                      abrirModalReplicar();
                    }}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Replicar Pautas
                  </Button>
                </div>

                {/* Barra de Progreso */}
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                    <span className="text-xs sm:text-sm font-medium">Progreso del mes</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {resumen.instalaciones_con_pauta_count} de {resumen.total_instalaciones} instalaciones
                    </span>
                  </div>
                  <Progress value={porcentajeProgreso} className="h-2 sm:h-3" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      <span>Con pauta creada</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                      <span>Pendiente de crear</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs optimizados para móviles */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <KPIBox
            title="Total Instalaciones"
            value={resumen.total_instalaciones}
            icon={Building2}
            color="blue"
          />
          <KPIBox
            title="Con Pauta"
            value={resumen.instalaciones_con_pauta_count}
            icon={CheckCircle}
            color="green"
            subtitle={`${porcentajeProgreso}% completado`}
          />
          <KPIBox
            title="Sin Pauta"
            value={resumen.instalaciones_sin_pauta.length}
            icon={Clock}
            color="orange"
          />
          <KPIBox
            title="Progreso"
            value={`${porcentajeProgreso}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>
      )}

      {/* Mensaje de estado optimizado para móviles */}
      {mensaje && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 sm:p-4 rounded-lg border-l-4 ${
            mensaje.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-400' 
              : mensaje.includes('⚠️')
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400'
              : mensaje.includes('ℹ️')
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-400'
          }`}
        >
          <div className="flex items-start gap-2">
            {mensaje.includes('✅') ? (
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            ) : mensaje.includes('⚠️') ? (
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            ) : mensaje.includes('ℹ️') ? (
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <span className={`text-xs sm:text-sm ${
              mensaje.includes('✅') 
                ? 'text-green-800 dark:text-green-200' 
                : mensaje.includes('⚠️')
                ? 'text-yellow-800 dark:text-yellow-200'
                : mensaje.includes('ℹ️')
                ? 'text-blue-800 dark:text-blue-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {mensaje}
            </span>
          </div>
        </motion.div>
      )}

      {/* Contenido principal optimizado para móviles */}
      {loading ? (
        <Card>
          <CardContent className="p-8 sm:p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-xs sm:text-sm">Cargando resumen...</span>
            </div>
          </CardContent>
        </Card>
      ) : resumen ? (
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {/* Mostrar todas las instalaciones, con o sin pauta */}
            {[
              ...resumen.instalaciones_con_pauta.map(inst => ({ ...inst, tipo: 'con_pauta' })),
              ...resumen.instalaciones_sin_pauta.map(inst => ({ ...inst, tipo: 'sin_pauta' }))
            ].map((instalacion: any) => (
              <InstalacionCard
                key={instalacion.id}
                instalacion={instalacion}
                tipo={instalacion.tipo}
                onAction={() => {
                  if (instalacion.tipo === 'con_pauta') {
                    verPauta(instalacion.id);
                    return;
                  }
                  // Si no tiene pauta, decidir según si tiene roles de servicio
                  const roles = (instalacion as any)?.roles as Array<any> | undefined;
                  const tieneRoles = Array.isArray(roles) && roles.length > 0;
                  if (!tieneRoles) {
                    router.push(`/instalaciones/${instalacion.id}`);
                  } else {
                    generarPautaAutomatica(instalacion.id);
                  }
                }}
                onEdit={instalacion.tipo === 'con_pauta' ? () => verPauta(instalacion.id) : undefined}
                onDelete={instalacion.tipo === 'con_pauta' ? () => abrirModalEliminar(instalacion.id, instalacion.nombre) : undefined}
                loading={loadingInstalacion === instalacion.id}
                mes={parseInt(selectedMes)}
                anio={parseInt(selectedAnio)}
                hideDireccion={true}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2">Selecciona un período</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Elige un mes y año para ver el resumen de pautas mensuales.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmación para eliminar pauta */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={cerrarModalEliminar}
        onConfirm={eliminarPauta}
        title="Eliminar Pauta Mensual"
        message={`¿Estás seguro de que quieres eliminar completamente la pauta mensual de ${deleteModal.instalacionNombre}? Esta acción no se puede deshacer y eliminará todos los datos de la pauta para ${selectedMes}/${selectedAnio}.`}
      />

      {/* Modal de Replicación de Pautas */}
      {replicarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Copy className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Replicar Pautas Mensuales</h2>
                    <p className="text-blue-100 text-sm">
                      Replicar desde {(() => {
                        const mesLabel = meses.find((m) => m.value === selectedMes)?.label || "Mes";
                        return `${mesLabel} ${selectedAnio || new Date().getFullYear()}`;
                      })()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cerrarModalReplicar}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Instrucciones */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">¿Cómo funciona la replicación?</p>
                    <p>Se replicarán las pautas del mes anterior manteniendo las series de turnos (4x4, 5x2, etc.) para continuar exactamente donde terminaron.</p>
                  </div>
                </div>
              </div>

              {/* Filtro de búsqueda */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Buscar instalaciones
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre de instalación..."
                    value={busquedaInstalacion}
                    onChange={(e) => setBusquedaInstalacion(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Lista de instalaciones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Instalaciones disponibles
                  </label>
                  <span className="text-xs text-gray-500">
                    {instalacionesDisponibles.filter(inst => 
                      inst.nombre.toLowerCase().includes(busquedaInstalacion.toLowerCase())
                    ).filter(inst => inst.seleccionada).length} de {instalacionesDisponibles.filter(inst => 
                      inst.nombre.toLowerCase().includes(busquedaInstalacion.toLowerCase())
                    ).length} seleccionadas
                  </span>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {instalacionesDisponibles
                    .filter(inst => 
                      inst.nombre.toLowerCase().includes(busquedaInstalacion.toLowerCase())
                    )
                    .map((instalacion) => (
                      <label
                        key={instalacion.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={instalacion.seleccionada}
                          onChange={(e) => {
                            setInstalacionesDisponibles(prev => 
                              prev.map(inst => 
                                inst.id === instalacion.id 
                                  ? { ...inst, seleccionada: e.target.checked }
                                  : inst
                              )
                            );
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {instalacion.nombre}
                        </span>
                      </label>
                    ))}
                </div>

                {/* Acciones rápidas */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setInstalacionesDisponibles(prev => 
                      prev.map(inst => ({ ...inst, seleccionada: true }))
                    )}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Seleccionar todas
                  </button>
                  <button
                    onClick={() => setInstalacionesDisponibles(prev => 
                      prev.map(inst => ({ ...inst, seleccionada: false }))
                    )}
                    className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deseleccionar todas
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex items-center justify-between">
              <button
                onClick={cerrarModalReplicar}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={replicarPautas}
                disabled={loading || instalacionesDisponibles.filter(inst => inst.seleccionada).length === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Replicando...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Replicar Pautas
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 