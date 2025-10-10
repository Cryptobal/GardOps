"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { 
  Building2, 
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Filter,
  Plus,
  MapPin,
  Calendar,
  X,
  Search,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Info,
  Users,
  Target,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";
import { useToast } from "../../components/ui/toast";
import dynamic from "next/dynamic";

// ✅ OPTIMIZACIÓN: Lazy load de modales (solo cargan cuando se abren)
const GuardiaSearchModal = dynamic(
  () => import("../../components/ui/guardia-search-modal").then(mod => ({ default: mod.GuardiaSearchModal })),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
    ssr: false
  }
);

const ModalExitoAsignacion = dynamic(
  () => import("../../components/ui/modal-exito-asignacion"),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
    ssr: false
  }
);

const ModalFechaInicioAsignacion = dynamic(
  () => import("../../components/ui/modal-fecha-inicio-asignacion"),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
    ssr: false
  }
);

// Componente KPI Box mejorado - Mobile First
const KPIBox = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  trend = null,
  tooltip = "",
  subtitle = ""
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color?: string;
  trend?: { value: number; isPositive: boolean } | null;
  tooltip?: string;
  subtitle?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="h-full cursor-help hover:shadow-md transition-shadow">
      <CardContent className="p-2 sm:p-4 flex flex-col justify-between h-full">
        <div className="flex flex-col items-center text-center space-y-1">
          <div className={`p-1 sm:p-2 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex-shrink-0`}>
            <Icon className={`h-3 w-3 sm:h-5 sm:w-5 text-${color}-600 dark:text-${color}-400`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-sm sm:text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground hidden sm:block truncate">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center justify-center gap-1 mt-1 hidden sm:flex">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Componente de resumen por instalación - Solo PPC activos (minimalista)
const ResumenInstalacion = ({ instalaciones }: { instalaciones: any[] }) => (
  <Card className="h-full">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Building2 className="h-5 w-5 text-blue-600" />
        <h3 className="text-base sm:text-lg font-semibold">PPC Activos por Instalación</h3>
        <Badge variant="outline" className="ml-auto text-xs">
          Total: {instalaciones.reduce((sum, inst) => sum + inst.ppc_activos, 0)}
        </Badge>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {instalaciones.map((inst) => (
          <div key={inst.instalacion} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{inst.instalacion}</h4>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="text-base sm:text-lg font-bold text-red-600">{inst.ppc_activos}</span>
              <Badge variant="destructive" className="text-xs">
                PPC
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Componente de resumen por rol - Solo PPC activos (minimalista)
const ResumenRol = ({ roles }: { roles: any[] }) => (
  <Card className="h-full">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Users className="h-5 w-5 text-orange-600" />
        <h3 className="text-base sm:text-lg font-semibold">PPC Activos por Rol</h3>
        <Badge variant="outline" className="ml-auto text-xs">
          Total: {roles.reduce((sum, rol) => sum + rol.ppc_activos, 0)}
        </Badge>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {roles.map((rol) => (
          <div key={rol.rol} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{rol.rol}</h4>
              <p className="text-xs text-muted-foreground truncate">{rol.horario}</p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="text-base sm:text-lg font-bold text-red-600">{rol.ppc_activos}</span>
              <Badge variant="destructive" className="text-xs">
                PPC
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default function PPCPage() {
  const router = useRouter();
  const [ppcs, setPpcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<any>(null);
  const [filtrosExpanded, setFiltrosExpanded] = useState(false);

  // Filtros mejorados - Solo PPC activos por defecto
  const [filtros, setFiltros] = useState({
    estado: "Pendiente", // Solo mostrar PPC activos por defecto
    instalacion: "all",
    rol: "all",
    fechaDesde: "",
    fechaHasta: ""
  });

  // Estados para KPIs
  const [kpis, setKpis] = useState({
    total_abiertos: 0,
    total_cubiertos: 0,
    total_ppc: 0,
    tasa_actual: 0
  });

  // Resúmenes
  const [resumenInstalaciones, setResumenInstalaciones] = useState<any[]>([]);
  const [resumenRoles, setResumenRoles] = useState<any[]>([]);
  
  // Estado para modal de asignación de guardias
  const [modalGuardias, setModalGuardias] = useState({
    isOpen: false,
    ppcId: '',
    instalacionId: '',
    instalacionNombre: '',
    rolServicioNombre: ''
  });
  const [guardias, setGuardias] = useState<any[]>([]);
  const [loadingGuardias, setLoadingGuardias] = useState(false);
  const [asignando, setAsignando] = useState(false);
  
  // Estado para modal de éxito
  const [modalExito, setModalExito] = useState({
    isOpen: false,
    guardiaInfo: { nombre: '', rut: '' },
    ppcInfo: { instalacion: '', rol: '', horario: '' }
  });
  
  const { toast } = useToast();

  // Cargar datos de PPCs
  useEffect(() => {
    logger.debug("🔄 useEffect ejecutado con filtros:", filtros);
    fetchPPCs();
    fetchMetricas();
  }, [filtros]);

  const fetchPPCs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.append(key, value);
        }
      });

      logger.debug("🔍 Fetching PPCs con filtros:", filtros);
      const response = await fetch(`/api/ppc?${params}`);
      if (!response.ok) throw new Error("Error al cargar PPCs");
      
      const data = await response.json();
      logger.debug("✅ PPCs cargados:", data.length);
      setPpcs(data || []);
      
      // Calcular resúmenes
      calcularResumenes(data || []);
    } catch (error) {
      console.error("Error cargando PPCs:", error);
      // En caso de error, mostrar datos de ejemplo
      setPpcs([]);
      setResumenInstalaciones([]);
      setResumenRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetricas = async () => {
    try {
      logger.debug("📈 Fetching métricas...");
      const response = await fetch("/api/ppc/metricas");
      if (response.ok) {
        const data = await response.json();
        logger.debug("✅ Métricas cargadas:", data.estadisticas);
        setMetricas(data.metricas);
        setKpis(data.estadisticas);
      }
    } catch (error) {
      console.error("Error cargando métricas:", error);
      // En caso de error, usar valores por defecto
      setKpis({
        total_abiertos: 0,
        total_cubiertos: 0,
        total_ppc: 0,
        tasa_actual: 0
      });
    }
  };

  const onAsignacionCompletada = () => {
    // Recargar PPCs después de asignación exitosa
    fetchPPCs();
  };

  // Funciones para modal de guardias
  const abrirModalGuardias = async (ppc: any) => {
    console.log('🔍 Debug abrirModalGuardias con PPC:', {
      id: ppc.id,
      instalacion_id: ppc.instalacion_id,
      instalacion: ppc.instalacion,
      rol: ppc.rol
    });
    
    setModalGuardias({
      isOpen: true,
      ppcId: ppc.id,
      instalacionId: ppc.instalacion_id,
      instalacionNombre: ppc.instalacion,
      rolServicioNombre: ppc.rol
    });
    
    // Cargar guardias disponibles
    await cargarGuardias(ppc.instalacion_id);
  };

  const cerrarModalGuardias = () => {
    setModalGuardias({
      isOpen: false,
      ppcId: '',
      instalacionId: '',
      instalacionNombre: '',
      rolServicioNombre: ''
    });
    setGuardias([]);
  };

  const cerrarModalExito = () => {
    setModalExito({
      isOpen: false,
      guardiaInfo: { nombre: '', rut: '' },
      ppcInfo: { instalacion: '', rol: '', horario: '' }
    });
  };

  const cargarGuardias = async (instalacionId: string) => {
    try {
      setLoadingGuardias(true);
      const fecha = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams({
        fecha,
        instalacion_id: instalacionId
      });
      
      const response = await fetch(`/api/guardias/disponibles?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al obtener guardias disponibles');
      }
      const guardiasData = await response.json();
      const guardiasFinales = guardiasData.items || guardiasData.guardias || guardiasData;
      console.log('🔍 Debug PPC - guardias cargados:', guardiasFinales.slice(0, 3));
      setGuardias(guardiasFinales);
    } catch (error) {
      logger.error('Error cargando guardias::', error);
      toast.error('No se pudieron cargar los guardias', 'Error');
    } finally {
      setLoadingGuardias(false);
    }
  };

  // Estado para modal de fecha de inicio - INCLUIR DATOS DEL PPC
  const [modalFechaInicio, setModalFechaInicio] = useState({
    isOpen: false,
    guardiaId: '',
    guardiaNombre: '',
    guardiaInstalacionActual: '',
    // AGREGAR DATOS DEL PPC PARA QUE NO SE PIERDAN
    ppcId: '',
    instalacionNombre: '',
    rolServicioNombre: ''
  });

  const handleAsignarGuardia = async (guardiaId: string) => {
    // NUEVA LÓGICA: Solicitar fecha de inicio antes de asignar
    const guardiaInfo = guardias.find(g => g.id === guardiaId);
    
    console.log('🔍 Debug modalGuardias antes de abrir fecha:', {
      ppcId: modalGuardias.ppcId,
      instalacionNombre: modalGuardias.instalacionNombre,
      rolServicioNombre: modalGuardias.rolServicioNombre,
      guardiaId: guardiaId
    });
    
    setModalFechaInicio({
      isOpen: true,
      guardiaId: guardiaId,
      guardiaNombre: guardiaInfo?.nombre_completo || 'Guardia',
      guardiaInstalacionActual: guardiaInfo?.instalacion_actual_nombre || '',
      // COPIAR DATOS DEL PPC PARA QUE NO SE PIERDAN
      ppcId: modalGuardias.ppcId,
      instalacionNombre: modalGuardias.instalacionNombre,
      rolServicioNombre: modalGuardias.rolServicioNombre
    });
    
    // NO cerrar modal de guardias todavía - mantener datos del PPC
    // cerrarModalGuardias(); // COMENTADO para mantener variables
  };

  const handleConfirmarAsignacionConFecha = async (fechaInicio: string, observaciones?: string) => {
    try {
      setAsignando(true);
      
      console.log('🔍 Datos para asignación:', {
        guardia_id: modalFechaInicio.guardiaId,
        puesto_operativo_id: modalFechaInicio.ppcId, // USAR DATOS GUARDADOS
        fecha_inicio: fechaInicio,
        instalacion: modalFechaInicio.instalacionNombre, // USAR DATOS GUARDADOS
        rol: modalFechaInicio.rolServicioNombre // USAR DATOS GUARDADOS
      });

      const response = await fetch('/api/ppc/asignar-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: modalFechaInicio.guardiaId,
          puesto_operativo_id: modalFechaInicio.ppcId, // USAR DATOS GUARDADOS EN MODAL DE FECHA
          fecha_inicio: fechaInicio, // NUEVO: Fecha de inicio
          motivo_inicio: 'asignacion_ppc',
          observaciones
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('❌ Error en asignación:', data);
        throw new Error(data.error || 'Error al asignar guardia');
      }
      
      // Encontrar información del guardia seleccionado
      const guardiaSeleccionado = guardias.find(g => g.id === modalFechaInicio.guardiaId);
      
      // Encontrar información del PPC para obtener el horario
      const ppcActual = ppcs.find(p => p.id === modalGuardias.ppcId);
      
      // Mostrar modal de éxito con información detallada - USAR DATOS GUARDADOS
      const datosModalExito = {
        isOpen: true,
        guardiaInfo: {
          nombre: modalFechaInicio.guardiaNombre || guardiaSeleccionado?.nombre_completo || 'Guardia',
          rut: guardiaSeleccionado?.rut || ''
        },
        ppcInfo: {
          instalacion: modalFechaInicio.instalacionNombre, // USAR DATOS GUARDADOS
          rol: modalFechaInicio.rolServicioNombre, // USAR DATOS GUARDADOS  
          horario: ppcActual?.horario || '08:00 - 20:00',
          fechaInicio: fechaInicio // AGREGAR FECHA DE INICIO
        }
      };
      
      console.log('🔍 Datos para modal de éxito:', datosModalExito);
      setModalExito(datosModalExito);
      
      onAsignacionCompletada();
      
      // Cerrar ambos modales y limpiar estados
      setModalFechaInicio({
        isOpen: false,
        guardiaId: '',
        guardiaNombre: '',
        guardiaInstalacionActual: '',
        ppcId: '',
        instalacionNombre: '',
        rolServicioNombre: ''
      });
      cerrarModalGuardias();
      
    } catch (error) {
      logger.error('Error asignando guardia::', error);
      toast.error('No se pudo asignar el guardia', 'Error');
    } finally {
      setAsignando(false);
    }
  };

  // Calcular resúmenes - Solo PPC activos (pendientes)
  const calcularResumenes = (data: any[]) => {
    logger.debug("📊 Calculando resúmenes con datos:", data.length);
    
    // Filtrar solo PPC activos (pendientes)
    const ppcActivos = data.filter((ppc: any) => ppc.estado === 'Pendiente');
    logger.debug("🔍 PPC activos encontrados:", ppcActivos.length);
    
    // Resumen por instalación - Solo activos
    const resumenInst = ppcActivos.reduce((acc: any, ppc: any) => {
      if (!acc[ppc.instalacion]) {
        acc[ppc.instalacion] = {
          instalacion: ppc.instalacion,
          ppc_activos: 0
        };
      }
      
      acc[ppc.instalacion].ppc_activos++;
      return acc;
    }, {});
    
    const resumenInstArray = Object.values(resumenInst);
    logger.debug("🏢 Resumen instalaciones:", resumenInstArray);
    setResumenInstalaciones(resumenInstArray);

    // Resumen por rol - Solo activos
    const resumenRol = ppcActivos.reduce((acc: any, ppc: any) => {
      if (!acc[ppc.rol]) {
        acc[ppc.rol] = {
          rol: ppc.rol,
          horario: ppc.horario,
          ppc_activos: 0
        };
      }
      
      acc[ppc.rol].ppc_activos++;
      return acc;
    }, {});
    
    const resumenRolArray = Object.values(resumenRol);
    logger.debug("👥 Resumen roles:", resumenRolArray);
    setResumenRoles(resumenRolArray);
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      estado: "Pendiente",
      instalacion: "all",
      rol: "all",
      fechaDesde: "",
      fechaHasta: ""
    });
  };

  // Filtrar PPCs
  const filteredPpcs = useMemo(() => {
    return ppcs;
  }, [ppcs]);

  // Calcular días sin cubrir
  const calcularDiasSinCubrir = (ppc: any) => {
    if (!ppc.creado) return 0;
    const fechaCreacion = new Date(ppc.creado);
    const hoy = new Date();
    const diffTime = Math.abs(hoy.getTime() - fechaCreacion.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Columnas de la tabla mejoradas
  const columns: Column<any>[] = [
    {
      key: "instalacion",
      label: "Instalación",
      render: (ppc) => (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{ppc.instalacion}</p>
            <p className="text-sm text-muted-foreground truncate">{ppc.rol}</p>
            {ppc.coordenadas && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ubicación disponible</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "jornada",
      label: "Jornada",
      render: (ppc) => (
        <Badge variant={ppc.jornada === 'N' ? 'secondary' : 'default'}>
          {ppc.jornada}
        </Badge>
      ),
    },
    {
      key: "rol_tipo",
      label: "ROL",
      render: (ppc) => (
        <span className="font-medium">{ppc.rol_tipo}</span>
      ),
    },
    {
      key: "horario",
      label: "Horario",
      render: (ppc) => (
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{ppc.horario}</span>
        </div>
      ),
    },
    {
      key: "guardia_asignado",
      label: "Guardia Asignado",
      render: (ppc) => (
        <div>
          {ppc.guardia_asignado ? (
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{ppc.guardia_asignado.nombre}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Sin asignar</span>
          )}
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      render: (ppc) => {
        const diasSinCubrir = calcularDiasSinCubrir(ppc);
        const esUrgente = diasSinCubrir > 7;
        
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={ppc.estado === 'Pendiente' ? 'destructive' : 'default'}>
              {ppc.estado === 'Pendiente' ? 'Abierto' : 'Cubierto'}
            </Badge>
            {ppc.estado === 'Pendiente' && esUrgente && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-500">{diasSinCubrir} días</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (ppc) => (
        <div className="flex flex-col gap-2">
          {ppc.estado === 'Pendiente' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                logger.debug("Asignar guardia para PPC:", ppc.id);
                abrirModalGuardias(ppc);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
              disabled={asignando}
            >
              {asignando ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              ) : (
                "Asignar Guardia"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/instalaciones/${ppc.instalacion_id}`)}
              className="text-xs"
            >
              Ver instalación
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Obtener opciones para filtros
  const instalaciones = Array.from(new Set(ppcs.map((p: any) => p.instalacion))).sort();
  const roles = Array.from(new Set(ppcs.map((p: any) => p.rol))).sort();

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2 sm:space-x-4 mb-3 sm:mb-6">
        <div className="p-1 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
          <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-3xl font-bold truncate">PPC Activos</h1>
          <p className="text-xs sm:text-base text-muted-foreground">Gestión de puestos por cubrir pendientes de asignación</p>
        </div>
      </div>

      {/* KPIs - Solo PPC activos - Mobile First */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <KPIBox
          title="PPC Activos"
          value={kpis.total_abiertos}
          icon={AlertTriangle}
          color="red"
          tooltip="Puestos por cubrir que requieren asignación inmediata"
          subtitle="Requieren atención"
        />
        <KPIBox
          title="Instalaciones con PPC"
          value={resumenInstalaciones.length}
          icon={Building2}
          color="blue"
          tooltip="Número de instalaciones con PPC activos"
          subtitle="Instalaciones afectadas"
        />
        <KPIBox
          title="Roles con PPC"
          value={resumenRoles.length}
          icon={Users}
          color="orange"
          tooltip="Número de roles de servicio con PPC activos"
          subtitle="Roles afectados"
        />
      </div>

      {/* Resúmenes en cajas horizontales - Minimalistas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {resumenInstalaciones.length > 0 && (
          <ResumenInstalacion instalaciones={resumenInstalaciones} />
        )}

        {resumenRoles.length > 0 && (
          <ResumenRol roles={resumenRoles} />
        )}
      </div>

      {/* Filtros mejorados - Colapsible */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              <h3 className="text-base sm:text-lg font-semibold">Filtros</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">
                {filteredPpcs.length} resultados
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={limpiarFiltros}
                className="flex items-center gap-1 h-8 px-2"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline text-xs">Limpiar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltrosExpanded(!filtrosExpanded)}
                className="flex items-center gap-1 h-8 px-2"
              >
                <span className="text-xs">Filtros</span>
                {filtrosExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          
          <AnimatePresence>
            {filtrosExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
              >
            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <Select
                value={filtros.estado}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">PPC Activos</SelectItem>
                  <SelectItem value="Cubierto">PPC Cubiertos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Instalación</label>
              <Select
                value={filtros.instalacion}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las instalaciones</SelectItem>
                  {instalaciones.map((instalacion) => (
                    <SelectItem key={instalacion} value={instalacion}>
                      {instalacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rol de Servicio</label>
              <Select
                value={filtros.rol}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, rol: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {roles.map((rol) => (
                    <SelectItem key={rol} value={rol}>
                      {rol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rango de fechas</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="date"
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fechaDesde: e.target.value }))}
                  placeholder="Desde"
                />
                <Input
                  type="date"
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fechaHasta: e.target.value }))}
                  placeholder="Hasta"
                />
              </div>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredPpcs}
            columns={columns}
            loading={loading}
            emptyMessage="No se encontraron PPCs"
            mobileCard={(ppc) => (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ppc.instalacion}</p>
                      <p className="text-sm text-muted-foreground truncate">{ppc.rol}</p>
                    </div>
                    <Badge variant={ppc.estado === 'Pendiente' ? 'destructive' : 'default'}>
                      {ppc.estado === 'Pendiente' ? 'Abierto' : 'Cubierto'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Jornada:</span>
                      <Badge variant={ppc.jornada === 'N' ? 'secondary' : 'default'}>
                        {ppc.jornada}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ROL:</span>
                      <span className="text-sm font-medium truncate">{ppc.rol_tipo}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{ppc.horario}</span>
                    </div>
                    
                    {ppc.coordenadas && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Ubicación disponible</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 pt-2">
                      {ppc.guardia_asignado ? (
                        <>
                          <User className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium truncate">{ppc.guardia_asignado.nombre}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin guardia asignado</span>
                      )}
                    </div>
                    
                    {ppc.estado === 'Pendiente' && calcularDiasSinCubrir(ppc) > 7 && (
                      <div className="flex items-center gap-1 pt-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-500">{calcularDiasSinCubrir(ppc)} días sin cubrir</span>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      {ppc.estado === 'Pendiente' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            logger.debug("Asignar guardia para PPC:", ppc.id);
                            abrirModalGuardias(ppc);
                          }}
                          disabled={asignando}
                        >
                          {asignando ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          ) : (
                            "Asignar Guardia"
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => router.push(`/instalaciones/${ppc.instalacion_id}`)}
                        >
                          Ver instalación
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          />
        </CardContent>
      </Card>

      {/* Modal de búsqueda de guardias */}
      <GuardiaSearchModal
        isOpen={modalGuardias.isOpen && !modalFechaInicio.isOpen} // No mostrar si está abierto modal de fecha
        onClose={cerrarModalGuardias}
        onSelectGuardia={handleAsignarGuardia}
        guardias={guardias}
        loading={loadingGuardias}
        title={`Asignar Guardia - ${modalGuardias.rolServicioNombre}`}
        instalacionId={modalGuardias.instalacionId}
        instalacionNombre={modalGuardias.instalacionNombre}
      />

      {/* Modal de éxito de asignación */}
      <ModalExitoAsignacion
        isOpen={modalExito.isOpen}
        onClose={cerrarModalExito}
        guardiaInfo={modalExito.guardiaInfo}
        ppcInfo={modalExito.ppcInfo}
      />

      {/* NUEVO: Modal para solicitar fecha de inicio de asignación */}
      <ModalFechaInicioAsignacion
        isOpen={modalFechaInicio.isOpen}
        onClose={() => {
          console.log('🔍 Cerrando modal de fecha inicio');
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

      {/* Mensaje de éxito */}
      {(() => {
        logger.debug("✅ Dashboard PPC actualizado con resúmenes visuales completos");
        return null;
      })()}
    </div>
  );
} 