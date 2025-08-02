"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ToggleStatus } from "../../components/ui/toggle-status";
import { Input } from "../../components/ui/input";
import { 
  Building2, 
  Plus, 
  MapPin,
  Users,
  AlertTriangle,
  Shield,
  TrendingUp,
  Eye,
  FileText,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";

// Importar hooks
import { useEntityModal } from "../../hooks/useEntityModal";
import { useCrudOperations } from "../../hooks/useCrudOperations";

// Importar tipos y esquemas
import { Instalacion } from "../../lib/schemas/instalaciones";

// Importar componentes
import InstalacionModal from "../../components/instalaciones/InstalacionModal";

// Importar APIs
import { 
  obtenerInstalaciones,
  crearInstalacion,
  actualizarInstalacion,
  eliminarInstalacion,
  obtenerClientes,
  obtenerComunas,
  obtenerEstadisticasInstalacion,
  logInstalacionCreada,
  logEdicionInstalacion,
  logCambioEstadoInstalacion,
  obtenerDatosCompletosInstalaciones,
  obtenerDocumentosVencidosInstalaciones
} from "../../lib/api/instalaciones";

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
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
            <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function InstalacionesPage() {
  const router = useRouter();
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Activo");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [clientes, setClientes] = useState<any[]>([]);
  const [documentosVencidos, setDocumentosVencidos] = useState<{
    instalaciones: Array<{
      instalacion_id: string;
      instalacion_nombre: string;
      documentos_vencidos: number;
    }>;
    total: number;
  }>({ instalaciones: [], total: 0 });

  // Hooks para modales y operaciones CRUD
  const { 
    isCreateOpen, 
    isDetailOpen,
    selectedEntity, 
    openCreate, 
    openDetail, 
    closeAll 
  } = useEntityModal<Instalacion>();

  // Estados para KPIs
  const [kpis, setKpis] = useState({
    activos: 0,
    totalPuestos: 0,
    totalPPC: 0,
    documentosVencidos: 0
  });

  // Función para cargar datos de instalaciones
  const fetchInstalaciones = async () => {
    try {
      setLoading(true);
      
      // Usar la función optimizada que obtiene todo en una sola llamada
      const datosCompletos = await obtenerDatosCompletosInstalaciones();
      
      setInstalaciones(datosCompletos.instalaciones);
      setClientes(datosCompletos.clientes);
      
      // Cargar documentos vencidos
      let docsVencidosCount = 0;
      try {
        const docsVencidos = await obtenerDocumentosVencidosInstalaciones();
        setDocumentosVencidos(docsVencidos);
        docsVencidosCount = docsVencidos?.total || 0;
      } catch (error) {
        console.error("❌ Error cargando documentos vencidos:", error);
      }
      
      // Calcular KPIs
      const activos = datosCompletos.instalaciones?.filter((i: any) => i.estado === "Activo").length || 0;
      
      // Sumar todos los puestos creados
      const totalPuestos = datosCompletos.instalaciones?.reduce((sum: number, i: any) => {
        const puestos = parseInt(i.puestos_creados) || 0;
        return sum + puestos;
      }, 0) || 0;
      
      // Sumar todos los PPC pendientes
      const totalPPC = datosCompletos.instalaciones?.reduce((sum: number, i: any) => {
        const ppc = parseInt(i.ppc_pendientes) || 0;
        return sum + ppc;
      }, 0) || 0;

      console.log('📊 KPIs calculados:', { activos, totalPuestos, totalPPC, documentosVencidos: docsVencidosCount });

      setKpis({ activos, totalPuestos, totalPPC, documentosVencidos: docsVencidosCount });
    } catch (error) {
      console.error("Error cargando instalaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos de instalaciones
  useEffect(() => {
    fetchInstalaciones();
  }, []);

  // Filtrar instalaciones (con dependencias explícitas)
  const filteredInstalaciones = useMemo(() => {
    return instalaciones.filter((instalacion: any) => {
      const matchesSearch = 
        instalacion.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instalacion.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instalacion.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instalacion.comuna?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || 
        instalacion.estado === statusFilter;

      const matchesCliente = clienteFilter === "all" || 
        instalacion.cliente_id === clienteFilter;

      return matchesSearch && matchesStatus && matchesCliente;
    });
  }, [instalaciones, searchTerm, statusFilter, clienteFilter]);

  // Columnas de la tabla
  const columns: Column<any>[] = [
    {
      key: "instalacion",
      label: "Instalación",
      render: (instalacion) => (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium">{instalacion.nombre}</p>
            <p className="text-sm text-muted-foreground">{instalacion.cliente_nombre}</p>
          </div>
        </div>
      ),
    },
    {
      key: "ubicacion",
      label: "Ubicación",
      render: (instalacion) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{instalacion.direccion}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {instalacion.comuna}, {instalacion.ciudad}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "estadisticas",
      label: "Estadísticas",
      render: (instalacion) => {
        const puestosCreados = instalacion.puestos_creados || 0;
        const ppcPendientes = instalacion.ppc_pendientes || 0;
        
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Puestos:</span>
              <span className="text-sm font-medium">{puestosCreados}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">PPC:</span>
              <span className={`text-sm font-medium ${ppcPendientes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {ppcPendientes}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "documentos",
      label: "Documentos",
      render: (instalacion) => {
        const docsVencidosCount = documentosVencidos.instalaciones.find(
          doc => doc.instalacion_id === instalacion.id
        )?.documentos_vencidos || 0;
        
        if (docsVencidosCount > 0) {
          return <Badge variant="destructive">{docsVencidosCount} vencidos</Badge>;
        }
        return <Badge variant="default">Al día</Badge>;
      },
    },
    {
      key: "estado",
      label: "Estado",
      render: (instalacion) => (
        <div className="flex items-center justify-center">
          <ToggleStatus
            checked={instalacion.estado === "Activo"}
            disabled
            size="sm"
          />
        </div>
      ),
    },
  ];

  // Obtener clientes únicos para el filtro
  const clientesUnicos = Array.from(new Set(instalaciones.map(i => i.cliente_id).filter(Boolean))).sort();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
          <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Instalaciones</h1>
          <p className="text-muted-foreground">Gestiona las instalaciones y su estado operacional</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox
          title="Instalaciones Activas"
          value={kpis.activos}
          icon={Shield}
          color="green"
        />
        <KPIBox
          title="Total Puestos"
          value={kpis.totalPuestos}
          icon={Users}
          color="blue"
        />
        <KPIBox
          title="Total PPC"
          value={`${kpis.totalPPC} (${kpis.totalPuestos > 0 ? Math.round((kpis.totalPPC / kpis.totalPuestos) * 100) : 0}%)`}
          icon={Activity}
          color="orange"
        />
        <KPIBox
          title="Documentos Vencidos"
          value={kpis.documentosVencidos}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Filtros y Acciones */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Buscar instalaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">Todos los estados</option>
            <option value="Activo">Activas</option>
            <option value="Inactivo">Inactivas</option>
          </select>
          <select
            value={clienteFilter}
            onChange={(e) => setClienteFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">Todos los clientes</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>
        </div>
        
        <Button onClick={openCreate} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nueva Instalación</span>
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredInstalaciones}
            columns={columns}
            loading={loading}
            emptyMessage="No se encontraron instalaciones"
            onRowClick={(instalacion) => {
              console.log("Ver detalles de instalación", instalacion.id);
              router.push(`/instalaciones/${instalacion.id}`);
            }}
          />
        </CardContent>
      </Card>

      {/* Modal de instalaciones */}
      <InstalacionModal
        instalacion={null}
        isOpen={isCreateOpen}
        onClose={closeAll}
        onSuccess={(nuevaInstalacion) => {
          // Recargar la lista de instalaciones
          fetchInstalaciones();
        }}
      />

      {/* Toast placeholder */}
      {/* ToastContainer se implementará en la Parte 2 */}
    </div>
  );
} 