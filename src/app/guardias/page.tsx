"use client";

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
  XCircle,
  Download,
  Upload,
  MoreVertical,
  Power
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
import { useAuth } from "@/lib/hooks/useAuth";

// Importar tipos y esquemas
import { Guardia } from "../../lib/schemas/guardias";

// Importar el modal editable
import GuardiaModal from "../../components/guardias/GuardiaModal";
import { api } from '@/lib/api-client';
import { useSimpleInactivation } from "@/components/ui/confirm-inactivation-modal";
import { ActionDropdown } from "@/components/ui/action-dropdown";

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
      <CardContent className="p-3 sm:p-4 md:p-6 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground min-h-[1.2rem] sm:min-h-[1.5rem] flex items-center leading-tight">{title}</p>
            <p className="text-base sm:text-lg md:text-2xl font-bold truncate">{value}</p>
            {trend && (
              <p className={`text-xs sm:text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          <div className={`p-2 sm:p-2.5 md:p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex-shrink-0 ml-2 sm:ml-3`}>
            <Icon className={`h-3 w-3 sm:h-4 sm:w-4 md:h-6 md:w-6 text-${color}-600 dark:text-${color}-400`} />
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
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
  const [showOS10Stats, setShowOS10Stats] = useState(false);

  // Hooks para modales y operaciones CRUD
  const { 
    isCreateOpen, 
    isDetailOpen,
    selectedEntity, 
    openCreate, 
    openDetail, 
    closeAll 
  } = useEntityModal<Guardia>();

  // Hook para inactivación
  const { inactivateGuardia, ConfirmModal } = useSimpleInactivation();

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

  // Función para inactivar guardia
  const handleInactivateGuardia = async (guardia: Guardia, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Evitar que se active el onClick de la fila
    }

    try {
      // Verificar si se puede inactivar
      const checkResponse = await fetch(`/api/guardias/${guardia.id}/inactivar`);
      const checkData = await checkResponse.json();

      if (!checkData.success) {
        console.error('Error verificando guardia:', checkData.error);
        return;
      }

      const { can_inactivate, blockers = [] } = checkData.data;
      const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno || ''} ${guardia.apellido_materno || ''}`.trim();

      await inactivateGuardia(
        nombreCompleto,
        async () => {
          const response = await fetch(`/api/guardias/${guardia.id}/inactivar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              motivo: 'Inactivación desde interfaz de usuario'
            })
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Error inactivando guardia');
          }

          console.log('✅ Guardia inactivado:', data.message);
          
          // Recargar la página para actualizar datos
          window.location.reload();
        },
        can_inactivate ? [] : blockers
      );
    } catch (error) {
      console.error('Error en inactivación:', error);
    }
  };

  // Función para activar guardia
  const handleActivateGuardia = async (guardia: Guardia, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      const response = await fetch(`/api/guardias/${guardia.id}/activar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          motivo: 'Activación desde interfaz de usuario'
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error activando guardia');
      }

      console.log('✅ Guardia activado:', data.message);
      
      // Recargar la página para actualizar datos
      window.location.reload();
    } catch (error) {
      console.error('Error en activación:', error);
    }
  };



  const showToast = (message: string, type: string = "info") => {
    console.log(`Toast [${type}]:`, message);
  };

  // Función para exportar guardias a Excel
  const exportarExcel = async () => {
    try {
      const response = await fetch('/api/guardias/exportar');
      
      if (!response.ok) {
        throw new Error('Error al exportar datos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guardias_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast("✅ Excel exportado correctamente", "success");
    } catch (error) {
      console.error('Error exportando Excel:', error);
      showToast("❌ Error al exportar Excel", "error");
    }
  };

  // Función para descargar plantilla de nuevos guardias
  const descargarPlantilla = async () => {
    try {
      const response = await fetch('/api/guardias/plantilla');
      
      if (!response.ok) {
        throw new Error('Error al descargar plantilla');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_nuevos_guardias.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast("✅ Plantilla descargada correctamente", "success");
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      showToast("❌ Error al descargar plantilla", "error");
    }
  };

  // Función para importar guardias desde Excel
  const importarExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/guardias/importar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al importar archivo');
      }

      const result = await response.json();
      
      const mensaje = result.creados > 0 && result.actualizados > 0 
        ? `✅ Importación completada: ${result.creados} guardias creados, ${result.actualizados} actualizados`
        : result.creados > 0 
        ? `✅ Importación completada: ${result.creados} guardias creados`
        : `✅ Importación completada: ${result.actualizados} guardias actualizados`;
      
      showToast(mensaje, "success");
      
      // Recargar la lista de guardias
      window.location.reload();
    } catch (error) {
      console.error('Error importando Excel:', error);
      showToast(`❌ Error: ${error instanceof Error ? error.message : 'Error al importar'}`, "error");
    } finally {
      // Limpiar el input para permitir cargar el mismo archivo nuevamente
      event.target.value = '';
    }
  };

  // Estados para KPIs
  const [kpis, setKpis] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    os10PorVencer: 0,
    os10Vencidos: 0
  });

  // Cargar guardias
  useEffect(() => {
    const fetchGuardias = async () => {
      if (!allowed || !isAuthenticated) return; // no cargar si no tiene permiso o no está autenticado
      console.log("🔍 GuardiasPage: Iniciando carga de guardias...");
      try {
        setLoading(true);
        const result = await api.guardias.getAll() as any;
        
        // La API devuelve directamente {items: [...]}
        if (result.items) {
          const guardiasData = result.items || [];
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
        } else {
          console.error("🔍 GuardiasPage: Error en respuesta:", result.error);
          throw new Error(`Error al cargar guardias: ${result.error}`);
        }
      } catch (error) {
        console.error("🔍 GuardiasPage: Error cargando guardias:", error);
        showToast("Error al cargar guardias", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchGuardias();
  }, [allowed, isAuthenticated]);

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
        (statusFilter === "activo" && (guardia.estado === 'activo' || guardia.activo === true)) ||
        (statusFilter === "inactivo" && (guardia.estado === 'inactivo' || guardia.activo === false));

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
            <p className="text-sm text-muted-foreground">{guardia.rut || 'Sin RUT'}</p>
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
            variant={guardia.estado === 'activo' || guardia.activo === true ? 'success' : 'secondary'}
            className={`${
              guardia.estado === 'activo' || guardia.activo === true
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
            }`}
          >
            {guardia.estado || (guardia.activo === true ? 'activo' : 'inactivo')}
          </Badge>
        </div>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (guardia) => (
        <div className="flex items-center justify-center">
          <ActionDropdown
            isActive={guardia.estado === 'activo' || guardia.activo === true}
            onInactivate={(e) => handleInactivateGuardia(guardia, e)}
            onActivate={(e) => handleActivateGuardia(guardia, e)}
            entityType="guardia"
          />
        </div>
      ),
    },

  ];

  // Obtener instalaciones únicas para el filtro
  const instalaciones = Array.from(new Set(guardias.map((g: any) => g.instalacion_asignada).filter(Boolean))).sort();

  // Mostrar información de depuración si no hay permisos
  if (permLoading || authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Usuario No Autenticado</h2>
            <p className="text-gray-600 mb-4">
              Debes iniciar sesión para acceder a esta página.
            </p>
            <Button onClick={() => router.push('/login')}>
              Ir al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 mb-4">
              No tienes permisos para ver guardias.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p><strong>Usuario:</strong> {user?.email}</p>
              <p><strong>Estado de autenticación:</strong> {isAuthenticated ? 'Sí' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* KPIs en una sola línea */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
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
        {/* Barra de búsqueda y botón principal */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar guardias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          <Button 
            onClick={() => setShowFilters(!showFilters)}
            variant="outline" 
            className="flex items-center gap-2 sm:w-auto"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          
          <Button onClick={openCreate} className="flex items-center space-x-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Guardia</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>

          {/* Botón Exportar Excel */}
          <Button 
            onClick={exportarExcel} 
            variant="outline" 
            className="flex items-center space-x-2 w-full sm:w-auto"
            disabled={loading || guardias.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
            <span className="sm:hidden">Exportar</span>
          </Button>

          {/* Botón Descargar Plantilla */}
          <Button 
            onClick={descargarPlantilla} 
            variant="outline" 
            className="flex items-center space-x-2 w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Plantilla</span>
            <span className="sm:hidden">Plantilla</span>
          </Button>

          {/* Botón Importar Excel */}
          <Button 
            onClick={() => document.getElementById('import-excel')?.click()} 
            variant="outline" 
            className="flex items-center space-x-2 w-full sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Excel</span>
            <span className="sm:hidden">Importar</span>
          </Button>

          {/* Input oculto para seleccionar archivo */}
          <input
            id="import-excel"
            type="file"
            accept=".xlsx,.xls"
            onChange={importarExcel}
            className="hidden"
          />
        </div>

        {/* Contador de resultados filtrados */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredGuardias.length === guardias.length ? (
              <span>Mostrando todos los {filteredGuardias.length} guardias</span>
            ) : (
              <span>
                Mostrando {filteredGuardias.length} de {guardias.length} guardias
                {searchTerm && ` para "${searchTerm}"`}
                {statusFilter !== 'all' && ` (${statusFilter === 'activo' ? 'Activos' : 'Inactivos'})`}
                {tipoFilter !== 'all' && ` (${tipoFilter === 'contratado' ? 'Contratados' : 'Esporádicos'})`}
                {os10Filter !== 'all' && (
                  os10Filter === 'por_vencer' ? ' (OS10 Por Vencer)' :
                  os10Filter === 'vencido' ? ' (OS10 Vencidos)' :
                  ' (Sin OS10)'
                )}
              </span>
            )}
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm w-full sm:w-48"
              >
                <option value="all">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm w-full sm:w-48"
              >
                <option value="all">Todos los tipos</option>
                <option value="contratado">Contratados</option>
                <option value="esporadico">Esporádicos</option>
              </select>
              <select
                value={instalacionFilter}
                onChange={(e) => setInstalacionFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm w-full sm:w-48"
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
                className="px-3 py-2 border rounded-md bg-background text-sm w-full sm:w-48"
              >
                <option value="all">Todos los OS10</option>
                <option value="por_vencer">OS10 Por Vencer</option>
                <option value="vencido">OS10 Vencidos</option>
                <option value="sin_fecha">Sin OS10</option>
              </select>
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
                className="text-xs h-10 px-3"
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
                      <p className="text-xs text-muted-foreground truncate">{guardia.rut || 'Sin RUT'}</p>
                      
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

      {/* Modal de confirmación para inactivación */}
      <ConfirmModal />

      {/* Toast placeholder */}
      {/* ToastContainer se implementará en la Parte 2 */}
    </div>
  );
}
