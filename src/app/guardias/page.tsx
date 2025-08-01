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
  Eye,
  Building2,
  Shield,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";

// Importar hooks
import { useEntityModal } from "../../hooks/useEntityModal";
import { useCrudOperations } from "../../hooks/useCrudOperations";

// Importar tipos y esquemas
import { Guardia } from "../../lib/schemas/guardias";

// Importar el modal editable
import GuardiaModal from "../../components/guardias/GuardiaModal";

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

export default function GuardiasPage() {
  const router = useRouter();
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("activo");
  const [instalacionFilter, setInstalacionFilter] = useState<string>("all");

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
    alertasOS10: 0
  });

  // Cargar datos de guardias
  useEffect(() => {
    const fetchGuardias = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/guardias");
        if (!response.ok) throw new Error("Error al cargar guardias");
        
        const data = await response.json();
        setGuardias(data.guardias || []);
        
        // Calcular KPIs
        const total = data.guardias?.length || 0;
        const activos = data.guardias?.filter((g: any) => g.activo).length || 0;
        const inactivos = total - activos;
        const alertasOS10 = data.guardias?.filter((g: any) => {
          // Lógica para detectar alertas OS10 usando la estructura real
          return g.alerta_os10?.tiene_alerta;
        }).length || 0;

        setKpis({ total, activos, inactivos, alertasOS10 });
      } catch (error) {
        console.error("Error cargando guardias:", error);
        showToast("Error al cargar guardias", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchGuardias();
  }, []);

  // Filtrar guardias (con dependencias explícitas)
  const filteredGuardias = useMemo(() => {
    return guardias.filter((guardia: any) => {
      const matchesSearch = 
        guardia.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guardia.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guardia.telefono?.includes(searchTerm) ||
        guardia.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "activo" && guardia.activo === true) ||
        (statusFilter === "inactivo" && guardia.activo === false);

      const matchesInstalacion = instalacionFilter === "all" || 
        guardia.instalacion_nombre === instalacionFilter;

      return matchesSearch && matchesStatus && matchesInstalacion;
    });
  }, [guardias, searchTerm, statusFilter, instalacionFilter]);

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
            <p className="font-medium">{guardia.nombre_completo}</p>
            <p className="text-sm text-muted-foreground">{guardia.rut}</p>
          </div>
        </div>
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
      key: "instalacion",
      label: "Instalación",
      render: (guardia) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{guardia.instalacion_nombre || "Sin asignar"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {guardia.rol_actual?.nombre || "Sin rol asignado"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "os10",
      label: "Estado OS10",
      render: (guardia) => {
        const alerta = guardia.alerta_os10;
        if (!alerta || alerta.estado === 'sin_fecha') {
          return <Badge variant="secondary">Sin OS10</Badge>;
        }

        if (alerta.estado === 'vencido') {
          return <Badge variant="destructive">Vencido</Badge>;
        } else if (alerta.estado === 'alerta') {
          return <Badge variant="outline" className="text-orange-600 border-orange-600">
            Por vencer ({alerta.dias_restantes} días)
          </Badge>;
        } else {
          return <Badge variant="default">Vigente</Badge>;
        }
      },
    },
    {
      key: "estado",
      label: "Estado",
      render: (guardia) => (
        <div className="flex items-center justify-center">
          <ToggleStatus
            checked={guardia.activo}
            disabled
            size="sm"
          />
        </div>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (guardia) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log("Ver detalles de guardia", guardia.id);
              router.push(`/guardias/${guardia.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Obtener instalaciones únicas para el filtro
  const instalaciones = Array.from(new Set(guardias.map(g => g.instalacion_nombre).filter(Boolean))).sort();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
          <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Guardias</h1>
          <p className="text-muted-foreground">Gestiona el personal de seguridad y sus documentos</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox
          title="Total Guardias"
          value={kpis.total}
          icon={Users}
          color="blue"
        />
        <KPIBox
          title="Guardias Activos"
          value={kpis.activos}
          icon={CheckCircle}
          color="green"
        />
        <KPIBox
          title="Guardias Inactivos"
          value={kpis.inactivos}
          icon={User}
          color="gray"
        />
        <KPIBox
          title="Alertas OS10"
          value={kpis.alertasOS10}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Filtros y Acciones */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Buscar guardias..."
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
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <select
            value={instalacionFilter}
            onChange={(e) => setInstalacionFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">Todas las instalaciones</option>
            {instalaciones.map((instalacion) => (
              <option key={instalacion} value={instalacion}>
                {instalacion}
              </option>
            ))}
          </select>
        </div>
        
        <Button onClick={openCreate} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nuevo Guardia</span>
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredGuardias}
            columns={columns}
            loading={loading}
            emptyMessage="No se encontraron guardias"
            onRowClick={(guardia) => {
              console.log("Ver detalles de guardia", guardia.id);
              router.push(`/guardias/${guardia.id}`);
            }}
          />
        </CardContent>
      </Card>

      {/* Modal placeholder */}
      {/* Modal editable de guardias */}
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

      {/* Toast placeholder */}
      {/* ToastContainer se implementará en la Parte 2 */}
    </div>
  );
}
