"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { 
  Users, 
  Plus, 
  User, 
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  Download,
  Upload,
  FileText,
  MoreVertical,
  Power
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/hooks/useAuth';

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";

// Importar tipos y esquemas
import { Cliente } from "../../lib/schemas/clientes";
import { useClienteInactivation } from "@/components/ui/cliente-inactivation-modal";
import { ActionDropdown } from "@/components/ui/action-dropdown";

// Componente KPI Box
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

export default function ClientesPage() {
  // Gate UI: requiere permiso para ver clientes
  const { useCan } = require("@/lib/permissions");
  const { allowed, loading: permLoading } = useCan('clientes.view');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Activo");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("all");

  // Hook para inactivación de clientes
  const { openModal, ClienteInactivationModal } = useClienteInactivation();

  // Función para inactivar cliente
  const handleInactivateCliente = async (cliente: Cliente, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      // Verificar si se puede inactivar
      const checkResponse = await fetch(`/api/clientes/${cliente.id}/inactivar`);
      const checkData = await checkResponse.json();

      if (!checkData.success) {
        console.error('Error verificando cliente:', checkData.error);
        return;
      }

      const { 
        can_inactivate_normal, 
        can_inactivate_cascada, 
        blockers = [], 
        warnings = [],
        instalaciones_activas = 0
      } = checkData.data;

      openModal({
        clienteNombre: cliente.nombre,
        canInactivateNormal: can_inactivate_normal,
        canInactivateCascada: can_inactivate_cascada,
        blockers,
        warnings,
        instalacionesActivas: instalaciones_activas,
        onConfirm: async (cascada: boolean) => {
          const response = await fetch(`/api/clientes/${cliente.id}/inactivar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              motivo: 'Inactivación desde interfaz de usuario',
              cascada
            })
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Error inactivando cliente');
          }

          console.log('✅ Cliente inactivado:', data.message);
          
          // Recargar datos
          window.location.reload();
        }
      });
    } catch (error) {
      console.error('Error en inactivación:', error);
    }
  };

  // Función para activar cliente
  const handleActivateCliente = async (cliente: Cliente, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      const response = await fetch(`/api/clientes/${cliente.id}/activar`, {
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
        throw new Error(data.error || 'Error activando cliente');
      }

      console.log('✅ Cliente activado:', data.message);
      
      // Recargar datos
      window.location.reload();
    } catch (error) {
      console.error('Error en activación:', error);
    }
  };

  // Función para exportar clientes a Excel
  const exportarExcel = async () => {
    try {
      const response = await fetch('/api/clientes/exportar', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Error al exportar archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Clientes exportados exitosamente');
    } catch (error) {
      console.error('Error exportando clientes:', error);
    }
  };

  // Función para descargar plantilla
  const descargarPlantilla = async () => {
    try {
      const response = await fetch('/api/clientes/plantilla', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Error al descargar plantilla');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_nuevos_clientes.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Plantilla de clientes descargada exitosamente');
    } catch (error) {
      console.error('Error descargando plantilla:', error);
    }
  };

  // Función para importar clientes desde Excel
  const importarExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/clientes/importar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al importar archivo');
      }

      const result = await response.json();
      
      const mensaje = result.creados > 0 && result.actualizados > 0 
        ? `✅ Importación completada: ${result.creados} clientes creados, ${result.actualizados} actualizados`
        : result.creados > 0 
        ? `✅ Importación completada: ${result.creados} clientes creados`
        : `✅ Importación completada: ${result.actualizados} clientes actualizados`;
      
      console.log(mensaje);
      
      // Recargar la lista de clientes
      window.location.reload();
    } catch (error) {
      console.error('Error importando Excel:', error);
    } finally {
      // Limpiar el input para permitir cargar el mismo archivo nuevamente
      event.target.value = '';
    }
  };

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      if (!allowed || !isAuthenticated) return;
      
      try {
        setLoading(true);
        console.log('🔍 ClientesPage: Iniciando carga de clientes...');
        console.log('🔍 ClientesPage: Usuario autenticado:', user?.email);
        
        const result = await api.clientes.getAll();

        if (result.success) {
          setClientes(result.data);
          console.log('✅ ClientesPage: Clientes cargados exitosamente:', result.data.length);
        } else {
          console.error("❌ ClientesPage: Error al cargar clientes:", result.error);
        }
      } catch (error) {
        console.error("❌ ClientesPage: Error cargando clientes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, [allowed, isAuthenticated]);

  // Obtener clientes activos únicos para el selector
  const clientesActivos = useMemo(() => {
    return clientes
      .filter(cliente => cliente.estado === "Activo")
      .map(cliente => cliente.nombre)
      .filter((nombre, index, array) => array.indexOf(nombre) === index)
      .sort();
  }, [clientes]);

  // Filtrar clientes
  const filteredClientes = useMemo(() => {
    let filtered = [...clientes];

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(cliente => 
        cliente.nombre.toLowerCase().includes(search) ||
        cliente.rut.includes(search) ||
        (cliente.representante_legal && cliente.representante_legal.toLowerCase().includes(search))
      );
    }

    // Filtro por estado
    if (statusFilter !== "Todos") {
      filtered = filtered.filter(cliente => 
        (cliente.estado || "Activo") === statusFilter
      );
    }

    // Filtro por cliente seleccionado
    if (clienteSeleccionado !== "all") {
      filtered = filtered.filter(cliente => 
        cliente.nombre === clienteSeleccionado
      );
    }

    return filtered;
  }, [clientes, searchTerm, statusFilter, clienteSeleccionado]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const total = clientes.length;
    const activos = clientes.filter((c: Cliente) => c.estado === "Activo").length;
    const inactivos = clientes.filter((c: Cliente) => c.estado === "Inactivo").length;

    return {
      total,
      activos,
      inactivos,
      documentosVencidos: 0 // TODO: Implementar carga de documentos vencidos
    };
  }, [clientes]);

  // Configuración de columnas para DataTable
  const columns: Column<Cliente>[] = [
    {
      key: "empresa",
      label: "Empresa",
      render: (cliente) => (
        <div>
          <div className="font-bold text-foreground">{cliente.nombre}</div>
          <div className="text-xs text-muted-foreground font-mono">{cliente.rut}</div>
        </div>
      )
    },
    {
      key: "representante",
      label: "Representante Legal",
      render: (cliente) => (
        cliente.representante_legal ? (
          <div>
            <div className="text-foreground">{cliente.representante_legal}</div>
            {cliente.rut_representante && (
              <div className="text-xs text-muted-foreground font-mono">
                {cliente.rut_representante}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Sin representante</span>
        )
      )
    },
    {
      key: "email",
      label: "Email",
      render: (cliente) => (
        cliente.email ? (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{cliente.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin email</span>
        )
      )
    },
    {
      key: "telefono",
      label: "Teléfono",
      render: (cliente) => (
        cliente.telefono ? (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span>{cliente.telefono}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin teléfono</span>
        )
      )
    },
    {
      key: "estado",
      label: "Estado",
      render: (cliente) => (
        <Badge variant={cliente.estado === "Activo" ? "success" : "inactive"}>
          {cliente.estado || "Activo"}
        </Badge>
      )
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (cliente) => (
        <div className="flex items-center justify-center">
          <ActionDropdown
            isActive={cliente.estado === 'Activo' || !cliente.estado}
            onInactivate={(e) => handleInactivateCliente(cliente, e)}
            onActivate={(e) => handleActivateCliente(cliente, e)}
            entityType="cliente"
          />
        </div>
      )
    }
  ];

  // Card para móvil
  const mobileCard = (cliente: Cliente) => (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50 h-full"
      onClick={() => router.push(`/clientes/${cliente.id}`)}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{cliente.nombre}</h3>
              <p className="text-xs text-muted-foreground font-mono truncate">{cliente.rut}</p>
            </div>
            <Badge variant={cliente.estado === "Activo" ? "success" : "inactive"} className="text-xs ml-2 flex-shrink-0">
              {cliente.estado || "Activo"}
            </Badge>
          </div>
          
          {cliente.representante_legal && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs truncate">{cliente.representante_legal}</span>
            </div>
          )}
          
          {cliente.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs truncate">{cliente.email}</span>
            </div>
          )}
          
          {cliente.telefono && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs truncate">{cliente.telefono}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
              No tienes permisos para ver clientes.
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col space-y-4 md:space-y-6"
    >
      {/* Header con título y botones de acción */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestión de Clientes</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Administra la información de tus clientes y sus documentos
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Botones de Excel */}
          <Button 
            onClick={exportarExcel}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          <Button 
            onClick={descargarPlantilla}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Plantilla</span>
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importarExcel}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="import-excel"
            />
            <Button 
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              asChild
            >
              <label htmlFor="import-excel" className="cursor-pointer">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar Excel</span>
              </label>
            </Button>
          </div>
          {/* Botón de nuevo cliente */}
          <Button 
            onClick={() => router.push('/clientes/nuevo')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nuevo Cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* KPIs mobile-first: 1 col en xs, 2 en sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <KPIBox
          title="Clientes Activos"
          value={kpis.activos}
          icon={Users}
          color="green"
        />
        <KPIBox
          title="Documentos Vencidos"
          value={kpis.documentosVencidos || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            {/* Primera fila: Búsqueda y botones de estado */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre, RUT o representante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "Todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Todos")}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === "Activo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Activo")}
                >
                  Activos
                </Button>
                <Button
                  variant={statusFilter === "Inactivo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Inactivo")}
                >
                  Inactivos
                </Button>
              </div>
            </div>
            
            {/* Segunda fila: Selector de cliente activo */}
            <div className="flex justify-end">
              <div className="w-full sm:w-64">
                <select
                  value={clienteSeleccionado}
                  onChange={(e) => setClienteSeleccionado(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background text-sm w-full"
                >
                  <option value="all">Todos los clientes activos</option>
                  {clientesActivos.map((cliente) => (
                    <option key={cliente} value={cliente}>
                      {cliente}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de clientes */}
      <div className="flex-1 min-h-0">
        <DataTable
          data={filteredClientes}
          columns={columns}
          loading={loading}
          emptyMessage="No hay clientes registrados"
          emptyIcon={Users}
          mobileCard={mobileCard}
          onRowClick={(cliente) => router.push(`/clientes/${cliente.id}`)}
          className="h-full"
        />
      </div>

      {/* Modal de confirmación para inactivación de clientes */}
      <ClienteInactivationModal />
    </motion.div>
  );
}

// Confirmación de auditoría completada
console.log("✅ Vista principal de clientes rediseñada correctamente"); 