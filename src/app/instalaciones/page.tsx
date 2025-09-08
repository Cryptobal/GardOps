"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { 
  Building2, 
  Plus,
  Users,
  AlertTriangle,
  CheckCircle,
  FileText,
  Shield,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Power
} from "lucide-react";
import { useRouter } from "next/navigation";
import InstalacionModal from "@/components/instalaciones/InstalacionModal";
import { api } from '@/lib/api-client';
import { useAuth } from "@/lib/hooks/useAuth";
import { useSimpleInactivation } from "@/components/ui/confirm-inactivation-modal";
import { ActionDropdown } from "@/components/ui/action-dropdown";

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Componente KPI Box optimizado para móviles
const KPIBox = React.memo(({ 
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
}) => {
  // Mapear colores a clases CSS específicas
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-600 dark:text-green-400'
        };
      case 'blue':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-600 dark:text-blue-400'
        };
      case 'purple':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/20',
          text: 'text-purple-600 dark:text-purple-400'
        };
      case 'red':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-600 dark:text-red-400'
        };
      default:
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-600 dark:text-blue-400'
        };
    }
  };

  const colorClasses = getColorClasses(color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full">
        <CardContent className="p-2 sm:p-4 md:p-6 flex flex-col justify-between h-full">
          <div className="flex flex-col space-y-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-base sm:text-lg md:text-2xl font-bold">{value}</p>
              <div className={`p-1 sm:p-2 rounded-full ${colorClasses.bg} flex-shrink-0`}>
                <Icon className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ${colorClasses.text}`} />
              </div>
            </div>
            {trend && (
              <p className={`text-xs sm:text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

KPIBox.displayName = 'KPIBox';

export default function InstalacionesPage() {
  // Gate UI: requiere permiso para ver instalaciones
  const { useCan } = require("@/lib/permissions");
  const { allowed, loading: permLoading } = useCan('instalaciones.view');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [instalaciones, setInstalaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("activo");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para el modal
  const [showModal, setShowModal] = useState(false);
  const [selectedInstalacion, setSelectedInstalacion] = useState<any>(null);

  // Hook para inactivación
  const { inactivateInstalacion, ConfirmModal } = useSimpleInactivation();

  // Estados para KPIs
  const [kpis, setKpis] = useState({
    instalaciones_activas: 0,
    puestos_activos: 0,
    ppc_activos: 0,
    documentos_vencidos: 0
  });

  // Debounce para la búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Función para exportar instalaciones a Excel
  const exportarExcel = async () => {
    try {
      const response = await fetch('/api/instalaciones/exportar', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Error al exportar archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `instalaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Instalaciones exportadas exitosamente');
    } catch (error) {
      console.error('Error exportando instalaciones:', error);
    }
  };

  // Función para descargar plantilla
  const descargarPlantilla = async () => {
    try {
      const response = await fetch('/api/instalaciones/plantilla', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Error al descargar plantilla');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_nuevas_instalaciones.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Plantilla de instalaciones descargada exitosamente');
    } catch (error) {
      console.error('Error descargando plantilla:', error);
    }
  };

  // Función para importar instalaciones desde Excel
  const importarExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/instalaciones/importar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al importar archivo');
      }

      const result = await response.json();
      
      const mensaje = result.creados > 0 && result.actualizados > 0 
        ? `✅ Importación completada: ${result.creados} instalaciones creadas, ${result.actualizados} actualizadas`
        : result.creados > 0 
        ? `✅ Importación completada: ${result.creados} instalaciones creadas`
        : `✅ Importación completada: ${result.actualizados} instalaciones actualizadas`;
      
      console.log(mensaje);
      
      // Recargar la lista de instalaciones
      window.location.reload();
    } catch (error) {
      console.error('Error importando Excel:', error);
    } finally {
      // Limpiar el input para permitir cargar el mismo archivo nuevamente
      event.target.value = '';
    }
  };

  // Función para cargar datos de instalaciones con estadísticas
  const fetchInstalaciones = useCallback(async () => {
    try {
      setLoading(true);
      
      const result = await api.instalaciones.getAll({ simple: 'true' }) as any;
      
      if (result.success) {
        console.log('🔍 Datos de instalaciones recibidos:', result.data);
        setInstalaciones(result.data || []);
      } else {
        console.error("Error cargando instalaciones:", result.error);
        setInstalaciones([]);
      }
    } catch (error) {
      console.error("Error cargando instalaciones:", error);
      setInstalaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para cargar KPIs
  const fetchKPIs = useCallback(async () => {
    try {
      console.log('🔍 Cargando KPIs de instalaciones...');
      const response = await fetch('/api/instalaciones/kpis');
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ KPIs cargados exitosamente:', data.data);
        setKpis(data.data);
      } else {
        console.error("Error cargando KPIs:", data.error);
      }
    } catch (error) {
      console.error("Error cargando KPIs:", error);
    }
  }, []);

  // Cargar datos de instalaciones y KPIs
  useEffect(() => {
    if (!allowed) return;
    fetchInstalaciones();
    fetchKPIs();
  }, [allowed]);

  // Log para debuggear KPIs
  useEffect(() => {
    console.log('🎯 KPIs actuales:', kpis);
  }, [kpis]);

  // Obtener lista de clientes únicos para el filtro
  const clientesUnicos = useMemo(() => {
    const clientes = instalaciones
      .map(inst => inst.cliente_nombre)
      .filter((nombre, index, array) => array.indexOf(nombre) === index && nombre)
      .sort();
    return clientes;
  }, [instalaciones]);

  // Filtrar instalaciones con memoización
  const filteredInstalaciones = useMemo(() => {
    return instalaciones.filter((instalacion: any) => {
      const matchesSearch = 
        instalacion.nombre?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        instalacion.cliente_nombre?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        instalacion.comuna?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        instalacion.ciudad?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "activo" && instalacion.estado === 'Activo') ||
        (statusFilter === "inactivo" && instalacion.estado === 'Inactivo');

      const matchesCliente = clienteFilter === "all" || 
        instalacion.cliente_nombre === clienteFilter;

      return matchesSearch && matchesStatus && matchesCliente;
    });
  }, [instalaciones, debouncedSearchTerm, statusFilter, clienteFilter]);

  const handleRowClick = useCallback((instalacion: any) => {
    router.push(`/instalaciones/${instalacion.id}`);
  }, [router]);

  // Función para inactivar instalación
  const handleInactivateInstalacion = useCallback(async (instalacion: any, event?: React.MouseEvent) => {
    console.log('🔍 handleInactivateInstalacion llamado para:', instalacion.nombre);
    if (event) {
      event.stopPropagation(); // Evitar que se active el onClick de la fila
    }

    try {
      // Verificar si se puede inactivar
      const checkResponse = await fetch(`/api/instalaciones/${instalacion.id}/inactivar`);
      const checkData = await checkResponse.json();

      if (!checkData.success) {
        console.error('Error verificando instalación:', checkData.error);
        return;
      }

      const { can_inactivate, blockers = [] } = checkData.data;

      console.log('🔍 Llamando a inactivateInstalacion con:', instalacion.nombre);
      await inactivateInstalacion(
        instalacion.nombre,
        async () => {
          console.log('🔍 Función de confirmación ejecutada');
          const response = await fetch(`/api/instalaciones/${instalacion.id}/inactivar`, {
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
            throw new Error(data.error || 'Error inactivando instalación');
          }

          console.log('✅ Instalación inactivada:', data.message);
          
          // Recargar datos
          await fetchInstalaciones();
          await fetchKPIs();
        },
        can_inactivate ? [] : blockers
      );
    } catch (error) {
      console.error('Error en inactivación:', error);
    }
  }, [inactivateInstalacion, fetchInstalaciones, fetchKPIs]);

  // Función para activar instalación
  const handleActivateInstalacion = useCallback(async (instalacion: any, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      const response = await fetch(`/api/instalaciones/${instalacion.id}/activar`, {
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
        throw new Error(data.error || 'Error activando instalación');
      }

      console.log('✅ Instalación activada:', data.message);
      
      // Recargar datos
      await fetchInstalaciones();
      await fetchKPIs();
    } catch (error) {
      console.error('Error en activación:', error);
    }
  }, [fetchInstalaciones, fetchKPIs]);

  // Funciones para manejar el modal
  const openCreateModal = useCallback(() => {
    setSelectedInstalacion(null);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedInstalacion(null);
  }, []);

  const handleModalSuccess = useCallback((instalacion: any) => {
    closeModal();
    fetchInstalaciones(); // Recargar la lista
    fetchKPIs(); // Recargar KPIs
  }, [closeModal, fetchInstalaciones, fetchKPIs]);

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
              No tienes permisos para ver instalaciones.
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
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Instalaciones</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">Gestiona las instalaciones y su estado operacional</p>
        </div>
      </div>

      {/* KPIs optimizados para móviles (mobile-first) */}
      <div className="grid grid-cols-4 sm:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-3 md:gap-4 lg:gap-6">
        <KPIBox
          title="Instalaciones Activas"
          value={kpis.instalaciones_activas}
          icon={CheckCircle}
          color="green"
        />
        <KPIBox
          title="Puestos Activos"
          value={kpis.puestos_activos}
          icon={Users}
          color="blue"
        />
        <KPIBox
          title="PPC Activos"
          value={kpis.ppc_activos}
          icon={Shield}
          color="purple"
        />
        <KPIBox
          title="Documentos Vencidos"
          value={kpis.documentos_vencidos}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Filtros y Acciones optimizados para móviles */}
      <div className="space-y-3 sm:space-y-4">
        {/* Barra de búsqueda y botón principal */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar instalaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          {/* Botones de Excel - Ocultos en móvil */}
          <Button 
            onClick={exportarExcel}
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          <Button 
            onClick={descargarPlantilla}
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Plantilla</span>
          </Button>
          <div className="relative hidden sm:block">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importarExcel}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="import-excel-instalaciones"
            />
            <Button 
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              asChild
            >
              <label htmlFor="import-excel-instalaciones" className="cursor-pointer">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar Excel</span>
              </label>
            </Button>
          </div>
          
          <Button 
            onClick={() => setShowFilters(!showFilters)}
            variant="outline" 
            className="flex items-center gap-2 sm:w-auto"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          
          <Button onClick={openCreateModal} className="flex items-center space-x-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva Instalación</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
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
                <option value="activo">Instalaciones Activas</option>
                <option value="all">Todas las instalaciones</option>
                <option value="inactivo">Instalaciones Inactivas</option>
              </select>
              
              <select
                value={clienteFilter}
                onChange={(e) => setClienteFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm w-full sm:w-48"
              >
                <option value="all">Todos los clientes</option>
                {clientesUnicos.map((cliente) => (
                  <option key={cliente} value={cliente}>
                    {cliente}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabla optimizada para móviles */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredInstalaciones.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No se encontraron instalaciones
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" || clienteFilter !== "all"
                  ? "Intenta ajustar los filtros de búsqueda" 
                  : "No hay instalaciones registradas"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Vista de escritorio */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4">Instalación</th>
                      <th className="text-left p-4">Cliente</th>
                      <th className="text-left p-4">Comuna</th>
                      <th className="text-left p-4">Puestos / PPC</th>
                      <th className="text-left p-4">Estado</th>
                      <th className="text-left p-4 w-16">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstalaciones.map((instalacion: any) => (
                      <tr 
                        key={instalacion.id}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(instalacion)}
                      >
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium">{instalacion.nombre}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-muted-foreground">{instalacion.cliente_nombre}</p>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {instalacion.comuna && (
                              <p className="font-medium">{instalacion.comuna}</p>
                            )}
                            {instalacion.ciudad && instalacion.ciudad !== instalacion.comuna && (
                              <p className="text-xs text-muted-foreground">{instalacion.ciudad}</p>
                            )}
                            {!instalacion.comuna && !instalacion.ciudad && (
                              <p className="text-muted-foreground">Sin ubicación</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              {(() => {
                                const ppcPendientes = parseInt(instalacion.ppc_pendientes);
                                const puestosCreados = parseInt(instalacion.puestos_creados);
                                const shouldBeGreen = ppcPendientes === 0 && puestosCreados > 0;
                                
                                return (
                                  <Users className={`h-4 w-4 ${
                                    shouldBeGreen ? 'text-green-500' : 'text-blue-500'
                                  }`} />
                                );
                              })()}
                              <span className={`text-sm font-medium ${
                                (parseInt(instalacion.ppc_pendientes) === 0 && parseInt(instalacion.puestos_creados) > 0)
                                  ? 'text-green-600 dark:text-green-400' 
                                  : ''
                              }`}>
                                {instalacion.puestos_creados || 0}
                              </span>
                            </div>
                            {parseInt(instalacion.ppc_pendientes) > 0 && (
                              <div className="flex items-center space-x-1">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                  {instalacion.ppc_pendientes}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            instalacion.estado === 'Activo' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {instalacion.estado}
                          </span>
                        </td>
                        <td className="p-4">
                          <ActionDropdown
                            isActive={instalacion.estado === 'Activo'}
                            onInactivate={(e) => handleInactivateInstalacion(instalacion, e)}
                            onActivate={(e) => handleActivateInstalacion(instalacion, e)}
                            entityType="instalacion"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil con cards (mobile-first: 1 columna en xs, 2 en sm+) */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
                {filteredInstalaciones.map((instalacion: any) => (
                  <Card 
                    key={instalacion.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(instalacion)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            instalacion.estado === 'Activo' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {instalacion.estado}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-medium text-sm truncate">{instalacion.nombre}</h3>
                          <p className="text-xs text-muted-foreground truncate">{instalacion.cliente_nombre}</p>
                          
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>📍 {instalacion.comuna || instalacion.ciudad || 'Sin ubicación'}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 pt-1">
                            <div className="flex items-center space-x-1">
                              {(() => {
                                const ppcPendientes = parseInt(instalacion.ppc_pendientes);
                                const puestosCreados = parseInt(instalacion.puestos_creados);
                                const shouldBeGreen = ppcPendientes === 0 && puestosCreados > 0;
                                
                                return (
                                  <Users className={`h-3 w-3 ${
                                    shouldBeGreen ? 'text-green-500' : 'text-blue-500'
                                  }`} />
                                );
                              })()}
                              <span className={`text-xs font-medium ${
                                (parseInt(instalacion.ppc_pendientes) === 0 && parseInt(instalacion.puestos_creados) > 0)
                                  ? 'text-green-600 dark:text-green-400' 
                                  : ''
                              }`}>
                                {instalacion.puestos_creados || 0}
                              </span>
                            </div>
                            
                            {parseInt(instalacion.ppc_pendientes) > 0 && (
                              <div className="flex items-center space-x-1">
                                <AlertTriangle className="h-3 w-3 text-orange-500" />
                                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                  {instalacion.ppc_pendientes}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal para crear/editar instalación */}
      <InstalacionModal
        instalacion={selectedInstalacion}
        isOpen={showModal}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de confirmación para inactivación */}
      <ConfirmModal />
    </div>
  );
} 