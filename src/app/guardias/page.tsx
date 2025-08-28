'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui'

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ToggleStatus } from "../../components/ui/toggle-status";
import { Input } from "../../components/ui/input";
import { 
  Users, 
  Plus, 
  User, 
  Building2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Clock,
  XCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { calcularEstadoOS10, obtenerEstadisticasOS10 } from "../../lib/utils/os10-status";
import { OS10StatusBadge } from "../../components/ui/os10-status-badge";
import { OS10StatsModal } from "../../components/ui/os10-stats-modal";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";

// Importar hooks
import { useEntityModal } from "../../hooks/useEntityModal";
import { useCrudOperations } from "../../hooks/useCrudOperations";

// Importar tipos y esquemas
import { Guardia } from "../../lib/schemas/guardias";

// Importar el modal editable
import GuardiaModal from "../../components/guardias/GuardiaModal";

// Componente KPI Box optimizado para móviles
const KPIBox = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  trend = null,
  onClick = null
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color?: string;
  trend?: { value: number; isPositive: boolean } | null;
  onClick?: (() => void) | null;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className={`h-full ${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`} onClick={onClick || undefined}>
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
            <p className="text-xl font-bold truncate">{value}</p>
            {trend && (
              <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex-shrink-0 ml-3`}>
            <Icon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function GuardiasPage() {
  // Gate UI: requiere permiso para ver guardias
  const { useCan } = require("@/lib/permissions");
  const { allowed, loading: permLoading } = useCan('guardias.view');

  const router = useRouter();
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("activo");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [instalacionFilter, setInstalacionFilter] = useState<string>("all");
  const [os10Filter, setOs10Filter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [os10ModalOpen, setOs10ModalOpen] = useState(false);
  const [os10ModalTipo, setOs10ModalTipo] = useState<'por_vencer' | 'vencido' | 'sin_fecha' | null>(null);

  // Hooks para modales y operaciones CRUD
  const { 
    isCreateOpen, 
    isDetailOpen,
    selectedEntity, 
    openCreate, 
    openDetail, 
    closeAll 
  } = useEntityModal<Guardia>();

  // Mock de operaciones CRUD para esta versión
  const createEntity = async (data: any) => {
    console.log("Crear guardia:", data);
    showToast("Funcionalidad en desarrollo", "info");
  };

  const updateEntity = async (id: string, data: any) => {
    console.log("Actualizar guardia:", id, data);
    showToast("Funcionalidad en desarrollo", "info");
  };

  const deleteEntity = async (id: string) => {
    console.log("Eliminar guardia:", id);
    showToast("Funcionalidad en desarrollo", "info");
  };



  const showToast = (message: string, type: string = "info") => {
    console.log(`Toast [${type}]:`, message);
  };

  // Estados para KPIs
  const [kpis, setKpis] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    os10PorVencer: 0,
    os10Vencidos: 0
  });

  // Cargar datos de guardias
  useEffect(() => {
    const fetchGuardias = async () => {
      if (!allowed) return; // no cargar si no tiene permiso
      console.log("🔍 GuardiasPage: Iniciando carga de guardias...");
      try {
        setLoading(true);
        console.log("🔍 GuardiasPage: Llamando a /api/guardias...");
        const response = await fetch("/api/guardias");
        console.log("🔍 GuardiasPage: Respuesta recibida:", response.status, response.ok);
        
        if (!response.ok) {
          console.error("🔍 GuardiasPage: Error en respuesta:", response.status, response.statusText);
          throw new Error(`Error al cargar guardias: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("🔍 GuardiasPage: Datos recibidos:", data);
        console.log("🔍 GuardiasPage: Items array:", (data as any)?.items);
        console.log(
          "🔍 GuardiasPage: Cantidad de guardias:",
          ((data as any)?.items?.length ?? (data as any)?.data?.length ?? (data as any)?.guardias?.length ?? (Array.isArray(data) ? data.length : 0)) || 0
        );
        
        // Aceptar múltiples formatos: {items:[]}, {data:[]}, {guardias:[]}, []
        const guardiasData: any[] = Array.isArray(data)
          ? data
          : ((data as any)?.items ?? (data as any)?.data ?? (data as any)?.guardias ?? []);
        setGuardias(guardiasData);
        
        // Calcular KPIs
        const total = guardiasData.length || 0;
        const activos = guardiasData.filter((g: any) => g.estado === 'activo' || g.activo === true).length || 0;
        const inactivos = total - activos;
        
        // Calcular estadísticas de OS10
        const estadisticasOS10 = obtenerEstadisticasOS10(guardiasData);

        setKpis({ 
          total, 
          activos, 
          inactivos, 
          os10PorVencer: estadisticasOS10.por_vencer,
          os10Vencidos: estadisticasOS10.vencidos
        });
        
        console.log("🔍 GuardiasPage: KPIs calculados:", { 
          total, 
          activos, 
          inactivos, 
          os10PorVencer: estadisticasOS10.por_vencer,
          os10Vencidos: estadisticasOS10.vencidos
        });
      } catch (error) {
        console.error("🔍 GuardiasPage: Error cargando guardias:", error);
        console.error("🔍 GuardiasPage: Stack trace:", error instanceof Error ? error.stack : 'No stack');
        showToast("Error al cargar guardias", "error");
      } finally {
        setLoading(false);
        console.log("🔍 GuardiasPage: Carga finalizada, loading = false");
      }
    };

    fetchGuardias();
  }, [allowed]);

  // Filtrar guardias (con dependencias explícitas)
  const filteredGuardias = useMemo(() => {
    return guardias.filter((guardia: any) => {
      const matchesSearch = 
        guardia.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guardia.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guardia.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guardia.telefono?.includes(searchTerm) ||
        guardia.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "activo" && guardia.activo === true) ||
        (statusFilter === "inactivo" && guardia.activo === false);

      const matchesTipo = tipoFilter === "all" || 
        (tipoFilter === "contratado" && guardia.tipo_guardia === 'contratado') ||
        (tipoFilter === "esporadico" && guardia.tipo_guardia === 'esporadico');

      const matchesInstalacion = instalacionFilter === "all" || 
        guardia.instalacion_asignada === instalacionFilter;

      // Filtro de OS10
      const estadoOS10 = calcularEstadoOS10(guardia.fecha_os10);
      const matchesOS10 = os10Filter === "all" || 
        (os10Filter === "por_vencer" && estadoOS10.estado === 'por_vencer') ||
        (os10Filter === "vencido" && estadoOS10.estado === 'vencido') ||
        (os10Filter === "sin_fecha" && estadoOS10.estado === 'sin_fecha');

      return matchesSearch && matchesStatus && matchesTipo && matchesInstalacion && matchesOS10;
    });
  }, [guardias, searchTerm, statusFilter, tipoFilter, instalacionFilter, os10Filter]);

  // Columnas de la tabla
  const columns: Column<any>[] = [
    {
      key: "guardia",
      label: "Guardia",
      render: (guardia) => (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium">{guardia.nombre || guardia.nombre_completo || 'Sin nombre'}</p>
            <p className="text-sm text-muted-foreground">{guardia.rut || guardia.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (guardia) => (
        <Badge 
          variant={guardia.tipo_guardia === 'contratado' ? 'default' : 'secondary'}
          className={`${
            guardia.tipo_guardia === 'contratado' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}
        >
          {guardia.tipo_guardia === 'contratado' ? 'Contratado' : 'Esporádico'}
        </Badge>
      ),
    },
    {
      key: "contacto",
      label: "Contacto",
      render: (guardia) => (
        <div>
          <p className="font-medium">{guardia.telefono}</p>
          <p className="text-sm text-muted-foreground">{guardia.email}</p>
        </div>
      ),
    },
    {
      key: "instalacion_asignada",
      label: "Instalación Asignada",
      render: (guardia) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {guardia.instalacion_asignada || "Sin asignar"}
            </span>
          </div>
          {guardia.instalacion_asignada && (
            <div className="flex items-center space-x-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {guardia.rol_actual || "Sin rol asignado"}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "os10",
      label: "Estado OS10",
      render: (guardia) => {
        return <OS10StatusBadge fechaOS10={guardia.fecha_os10} />;
      },
    },
    {
      key: "estado",
      label: "Estado",
      render: (guardia) => (
        <div className="flex items-center justify-center">
          <Badge 
            variant={guardia.activo === true ? 'success' : 'secondary'}
            className={`${
              guardia.activo === true
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
            }`}
          >
            {guardia.activo === true ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      ),
    },

  ];

  // Obtener instalaciones únicas para el filtro
  const instalaciones = Array.from(new Set(guardias.map((g: any) => g.instalacion_asignada).filter(Boolean))).sort();

  if (permLoading) return null;
  if (!allowed) return (<div className="p-4 text-sm text-muted-foreground">Sin acceso</div>);

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header optimizado para móviles */}
      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 mb-3 sm:mb-4 md:mb-6">
        <div className="p-2 sm:p-2.5 md:p-3 rounded-full bg-blue-100 dark:bg-blue-900/20 flex-shrink-0">
          <Shield className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Guardias</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">Gestiona el personal de seguridad y sus documentos</p>
        </div>
      </div>

      {/* KPIs mobile-first: 1 col en xs, 2 en sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
        <KPIBox
          title="Guardias Activos"
          value={kpis.activos}
          icon={CheckCircle}
          color="green"
          onClick={() => {
            setStatusFilter("activo");
            setOs10Filter("all");
          }}
        />
        <KPIBox
          title="OS10 Por Vencer"
          value={kpis.os10PorVencer}
          icon={Clock}
          color="yellow"
          onClick={() => {
            setOs10ModalTipo("por_vencer");
            setOs10ModalOpen(true);
          }}
        />
        <KPIBox
          title="OS10 Vencidos"
          value={kpis.os10Vencidos}
          icon={XCircle}
          color="red"
          onClick={() => {
            setOs10ModalTipo("vencido");
            setOs10ModalOpen(true);
          }}
        />
      </div>

      {/* Filtros y Acciones optimizados para móviles */}
      <div className="space-y-3 sm:space-y-4">
        {/* Barra de búsqueda y botones - Mobile First */}
        <div className="flex flex-col gap-3">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar guardias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowFilters(!showFilters)}
              variant="outline" 
              className="flex items-center gap-2 flex-1"
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </Button>
            
            <Button onClick={openCreate} className="flex items-center gap-2 flex-1">
              <Plus className="h-4 w-4" />
              <span>Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Filtros expandibles */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted/30 rounded-lg p-3 sm:p-4"
          >
            <div className="grid grid-cols-1 gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm w-full"
              >
                <option value="all">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm w-full"
              >
                <option value="all">Todos los tipos</option>
                <option value="contratado">Contratados</option>
                <option value="esporadico">Esporádicos</option>
              </select>
              <select
                value={instalacionFilter}
                onChange={(e) => setInstalacionFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm w-full"
              >
                <option value="all">Todas las instalaciones</option>
                {instalaciones.map((instalacion) => (
                  <option key={instalacion} value={instalacion}>
                    {instalacion}
                  </option>
                ))}
              </select>
              <select
                value={os10Filter}
                onChange={(e) => setOs10Filter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm w-full"
              >
                <option value="all">Todos los OS10</option>
                <option value="por_vencer">OS10 Por Vencer</option>
                <option value="vencido">OS10 Vencidos</option>
                <option value="sin_fecha">Sin OS10</option>
              </select>
            </div>
            <div className="flex justify-end mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("activo");
                  setTipoFilter("all");
                  setInstalacionFilter("all");
                  setOs10Filter("all");
                  setSearchTerm("");
                }}
                className="text-xs"
              >
                Limpiar Filtros
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabla optimizada para móviles */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            data={filteredGuardias}
            columns={columns}
            loading={loading}
            emptyMessage="No se encontraron guardias"
            onRowClick={(guardia) => {
              if (guardia?.id) {
                console.log("Ver detalles de guardia", guardia.id);
                router.push(`/guardias/${guardia.id}`);
              } else {
                console.log("Guardia sin ID:", guardia);
                showToast("No se puede ver el detalle de este guardia", "error");
              }
            }}
            mobileCard={(guardia) => (
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={guardia.tipo_guardia === 'contratado' ? 'default' : 'secondary'}
                          className={`text-xs ${
                            guardia.tipo_guardia === 'contratado' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}
                        >
                          {guardia.tipo_guardia === 'contratado' ? 'Contratado' : 'Esporádico'}
                        </Badge>
                        <ToggleStatus
                          checked={guardia.activo}
                          disabled
                          size="sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm truncate">{guardia.nombre || guardia.nombre_completo || 'Sin nombre'}</h3>
                      <p className="text-xs text-muted-foreground truncate">{guardia.rut || guardia.id}</p>
                      
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-medium">{guardia.telefono}</span>
                      </div>
                      
                      {guardia.email && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-muted-foreground truncate">{guardia.email}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1 pt-1">
                        <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs truncate">
                          {guardia.instalacion_asignada || "Sin asignar"}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex-1 min-w-0">
                          {guardia.instalacion_asignada && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {guardia.rol_actual || "Sin rol asignado"}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 ml-2">
                          <OS10StatusBadge fechaOS10={guardia.fecha_os10 || null} showDays={false} className="text-xs" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Botones de acción para móvil */}
                    <div className="flex items-center space-x-2 pt-2 mt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (guardia?.id) {
                            router.push(`/guardias/${guardia.id}`);
                          } else {
                            console.log("Guardia sin ID:", guardia);
                            showToast("No se puede ver el detalle de este guardia", "error");
                          }
                        }}
                      >
                        Ver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          />
        </CardContent>
      </Card>

      {/* Modal editable de guardias */}
      {(isCreateOpen || isDetailOpen) && (
        <GuardiaModal
          guardia={isCreateOpen ? null : selectedEntity}
          isOpen={isCreateOpen || isDetailOpen}
          onClose={closeAll}
          onSuccess={(guardia: any) => {
            console.log("✅ Guardia guardado exitosamente:", guardia);
            // Recargar la lista de guardias
            window.location.reload();
          }}
        />
      )}

      {/* Modal de estadísticas OS10 */}
      <OS10StatsModal
        isOpen={os10ModalOpen}
        onClose={() => {
          setOs10ModalOpen(false);
          setOs10ModalTipo(null);
        }}
        guardias={guardias}
        tipo={os10ModalTipo}
      />

      {/* Toast placeholder */}
      {/* ToastContainer se implementará en la Parte 2 */}
    </div>
  );
}
