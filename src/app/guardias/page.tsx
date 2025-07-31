"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Modal, useConfirmModal } from "../../components/ui/modal";
import { useToast, ToastContainer } from "../../components/ui/toast";
import { Input } from "../../components/ui/input";
import { 
  Shield, 
  Plus, 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";
import { PageHeader } from "../../components/ui/page-header";
import { FilterBar, FilterConfig } from "../../components/ui/filter-bar";

// Interfaces para guardias con la nueva estructura
interface RolActual {
  nombre?: string;
  turno?: string;
  horario_inicio?: string;
  horario_fin?: string;
  dias_trabajo?: string;
}

interface AlertaOS10 {
  dias_restantes: number | null;
  tiene_alerta: boolean;
  estado: 'sin_fecha' | 'vencido' | 'alerta' | 'vigente';
}

interface Guardia {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  nombre_completo: string;
  rut: string;
  email?: string;
  telefono?: string;
  sexo?: string;
  activo: boolean;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  nacionalidad?: string;
  fecha_os10?: string;
  latitud?: number;
  longitud?: number;
  instalacion_id?: string;
  instalacion_nombre?: string;
  cliente_nombre?: string;
  created_at: string;
  updated_at: string;
  rol_actual: RolActual;
  alerta_os10: AlertaOS10;
}

interface KPIData {
  totalGuardias: number;
  guardiasActivos: number;
  guardiasInactivos: number;
  alertasOS10: number;
}

export default function GuardiasPage() {
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [instalaciones, setInstalaciones] = useState<Array<{id: string, nombre: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Record<string, string>>({
    search: "",
    estado: "Todos",
    instalacion: "Todas",
    alerta_os10: "Todas",
    totalCount: "0",
    filteredCount: "0"
  });

  const { toast } = useToast();

  // Cargar instalaciones para el filtro
  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/instalaciones');
      if (response.ok) {
        const data = await response.json();
        setInstalaciones(data.data || []);
      }
    } catch (error) {
      console.error("❌ Error cargando instalaciones:", error);
    }
  };

  // Configuración de filtros
  const filterConfigs: FilterConfig[] = [
    {
      key: "estado",
      label: "Estado",
      type: "select",
      options: [
        { value: "Todos", label: "Todos" },
        { value: "Activo", label: "Activos" },
        { value: "Inactivo", label: "Inactivos" }
      ]
    },
    {
      key: "instalacion",
      label: "Instalación",
      type: "select-search",
      options: [
        { value: "Todas", label: "Todas las instalaciones" },
        ...instalaciones.map(inst => ({
          value: inst.id,
          label: inst.nombre
        }))
      ]
    },
    {
      key: "alerta_os10",
      label: "Alerta OS10",
      type: "select",
      options: [
        { value: "Todas", label: "Todas" },
        { value: "alerta", label: "⚠️ Con Alerta" },
        { value: "vencido", label: "❌ Vencido" },
        { value: "vigente", label: "✅ Vigente" },
        { value: "sin_fecha", label: "❓ Sin Fecha" }
      ]
    }
  ];

  // Cargar guardias e instalaciones al montar el componente
  useEffect(() => {
    cargarGuardias();
    cargarInstalaciones();
  }, []);

  const cargarGuardias = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/guardias');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("🔍 Debug - Datos recibidos de la API:", {
        total: data.total,
        guardiasLength: data.guardias.length,
        primeros3: data.guardias.slice(0, 3).map((g: any) => ({ id: g.id, nombre: g.nombre_completo }))
      });
      
      setGuardias(data.guardias);
      setFiltros(prev => ({
        ...prev,
        totalCount: data.guardias.length.toString()
      }));
      
      console.log("✅ Guardias cargados desde Neon:", data.guardias.length);
    } catch (error) {
      console.error("❌ Error cargando guardias:", error);
      toast.error("Error al cargar guardias desde la base de datos");
    } finally {
      setLoading(false);
    }
  };

  // Función para renderizar el estado de la alerta OS10
  const renderAlertaOS10 = (alerta: AlertaOS10, fechaOS10?: string) => {
    if (alerta.estado === 'sin_fecha') {
      return (
        <div className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-400">Sin fecha</span>
        </div>
      );
    }

    if (alerta.estado === 'vencido') {
      return (
        <div className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-red-500" />
          <span className="text-xs text-red-500 font-medium">Vencido</span>
        </div>
      );
    }

    if (alerta.estado === 'alerta') {
      return (
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-orange-500" />
          <span className="text-xs text-orange-500 font-medium">
            {alerta.dias_restantes} días
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span className="text-xs text-green-500 font-medium">
          {alerta.dias_restantes} días
        </span>
      </div>
    );
  };

  // Función para renderizar el rol actual
  const renderRolActual = (rol: RolActual) => {
    if (!rol.nombre) {
      return <span className="text-muted-foreground text-xs">Sin asignar</span>;
    }

    return (
      <div className="space-y-1">
        <div className="text-xs font-medium">{rol.nombre}</div>
        {rol.turno && (
          <div className="text-xs text-muted-foreground">
            {rol.turno} {rol.horario_inicio && rol.horario_fin && `(${rol.horario_inicio}-${rol.horario_fin})`}
          </div>
        )}
        {rol.dias_trabajo && (
          <div className="text-xs text-muted-foreground">{rol.dias_trabajo}</div>
        )}
      </div>
    );
  };

  // Calcular KPIs
  const calcularKPIs = (): KPIData => {
    const activos = guardias.filter(g => g.activo).length;
    const inactivos = guardias.filter(g => !g.activo).length;
    const alertasOS10 = guardias.filter(g => g.alerta_os10.tiene_alerta).length;

    return {
      totalGuardias: guardias.length,
      guardiasActivos: activos,
      guardiasInactivos: inactivos,
      alertasOS10
    };
  };

  const kpis = calcularKPIs();

  // Configuración de columnas para DataTable
  const columns: Column<Guardia>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (guardia) => (
        <div>
          <div className="font-bold text-foreground">{guardia.nombre_completo}</div>
          <div className="text-xs text-muted-foreground font-mono">{guardia.rut}</div>
        </div>
      )
    },
    {
      key: "contacto",
      label: "Contacto",
      render: (guardia) => (
        <div className="space-y-1">
          {guardia.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{guardia.email}</span>
            </div>
          )}
          {guardia.telefono && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{guardia.telefono}</span>
            </div>
          )}
          {guardia.comuna && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{guardia.comuna}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: "instalacion",
      label: "Instalación",
      render: (guardia) => (
        guardia.instalacion_nombre ? (
          <div className="space-y-1">
            <div className="text-foreground font-medium">{guardia.instalacion_nombre}</div>
            <div className="text-xs text-muted-foreground">{guardia.cliente_nombre}</div>
            {renderRolActual(guardia.rol_actual)}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Sin asignar</span>
        )
      )
    },
    {
      key: "fecha_os10",
      label: "OS10",
      render: (guardia) => (
        <div className="space-y-1">
          {guardia.fecha_os10 ? (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs">{new Date(guardia.fecha_os10).toLocaleDateString()}</span>
          </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sin fecha</span>
          )}
          {renderAlertaOS10(guardia.alerta_os10, guardia.fecha_os10)}
        </div>
      )
    },
    {
      key: "estado",
      label: "Estado",
      render: (guardia) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={guardia.activo}
            onCheckedChange={(checked) => {
              // Aquí iría la lógica para cambiar el estado
              console.log(`Cambiando estado de guardia ${guardia.id} a ${checked}`);
            }}
          />
          <Badge variant={guardia.activo ? "success" : "inactive"}>
            {guardia.activo ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      )
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (guardia) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log(`Ver detalles de guardia ${guardia.id}`);
            }}
            className="hover:bg-blue-500/10 hover:border-blue-500/30 h-7 w-7 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  // Card para móvil
  const mobileCard = (guardia: Guardia) => (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-foreground">{guardia.nombre_completo}</h3>
              <p className="text-sm text-muted-foreground font-mono">{guardia.rut}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={guardia.activo}
                onCheckedChange={(checked) => {
                  console.log(`Cambiando estado de guardia ${guardia.id} a ${checked}`);
                }}
              />
            </div>
          </div>
          
          {guardia.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{guardia.email}</span>
            </div>
          )}
          
          {guardia.telefono && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{guardia.telefono}</span>
            </div>
          )}
          
          {guardia.instalacion_nombre && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{guardia.instalacion_nombre}</span>
            </div>
          )}
          
          {guardia.rol_actual.nombre && (
          <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{guardia.rol_actual.nombre}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {renderAlertaOS10(guardia.alerta_os10, guardia.fecha_os10)}
          </div>
          
          <Button variant="outline" size="sm" className="w-full mt-2">
            Ver detalles
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Filtrar guardias según los filtros aplicados
  const guardiasFiltrados = guardias.filter(guardia => {
    if (filtros.search && filtros.search.trim()) {
      const busqueda = filtros.search.toLowerCase().trim();
      
      // Debug: Log para verificar qué está pasando con la búsqueda
      if (guardias.indexOf(guardia) < 3) { // Solo los primeros 3 guardias para no saturar
        console.log("🔍 Debug - Búsqueda:", busqueda, "para guardia:", {
          nombre: guardia.nombre,
          apellido_paterno: guardia.apellido_paterno,
          apellido_materno: guardia.apellido_materno,
          rut: guardia.rut,
          email: guardia.email
        });
      }
      
      // Buscar por apellidos que comiencen con las letras escritas
      const apellidoPaternoMatch = guardia.apellido_paterno?.toLowerCase().startsWith(busqueda);
      const apellidoMaternoMatch = guardia.apellido_materno?.toLowerCase().startsWith(busqueda);
      
      // Buscar por RUT que comience con los números escritos
      const rutMatch = guardia.rut.toLowerCase().startsWith(busqueda);
      
      // Buscar por nombre que comience con las letras escritas
      const nombreMatch = guardia.nombre?.toLowerCase().startsWith(busqueda);
      
      // Buscar por email que contenga la búsqueda
      const emailMatch = guardia.email?.toLowerCase().includes(busqueda);
      
      // Debug: Log de los matches
      if (guardias.indexOf(guardia) < 3) {
        console.log("🔍 Debug - Matches:", {
          apellidoPaternoMatch,
          apellidoMaternoMatch,
          rutMatch,
          nombreMatch,
          emailMatch,
          tieneMatch: apellidoPaternoMatch || apellidoMaternoMatch || rutMatch || nombreMatch || emailMatch
        });
      }
      
      // Si no hay ningún match, excluir este guardia
      const tieneMatch = apellidoPaternoMatch || apellidoMaternoMatch || rutMatch || nombreMatch || emailMatch;
      
      if (!tieneMatch) {
        return false;
      }
    }

    if (filtros.estado !== "Todos") {
      const estadoActivo = filtros.estado === "Activo";
      if (guardia.activo !== estadoActivo) {
        return false;
      }
    }

    if (filtros.instalacion !== "Todas") {
      if (guardia.instalacion_id !== filtros.instalacion) {
        return false;
      }
    }

    if (filtros.alerta_os10 !== "Todas") {
      if (guardia.alerta_os10.estado !== filtros.alerta_os10) {
        return false;
      }
    }

    return true;
  });

  // Debug: Log del filtrado
  console.log("🔍 Debug - Filtrado:", {
    totalGuardias: guardias.length,
    guardiasFiltrados: guardiasFiltrados.length,
    filtros: filtros
  });

  // Debug: Log de los KPIs
  console.log("🔍 Debug - KPIs:", kpis);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-full flex flex-col"
      >
        {/* PageHeader con KPIs */}
        <PageHeader
          title="Gestión de Guardias"
          description="Administra el personal de seguridad y sus asignaciones"
          actionButton={{
            label: "Nuevo Guardia",
            icon: Plus,
            onClick: () => {
              console.log("Abrir modal de nuevo guardia");
            }
          }}
          kpis={[
            {
              label: "Total Guardias",
              value: kpis.totalGuardias,
              icon: Shield,
              variant: "default"
            },
            {
              label: "Guardias Activos",
              value: kpis.guardiasActivos,
              icon: Shield,
              variant: "success"
            },
            {
              label: "Guardias Inactivos",
              value: kpis.guardiasInactivos,
              icon: Shield,
              variant: "warning"
            },
            {
              label: "Alertas OS10",
              value: kpis.alertasOS10,
              icon: AlertTriangle,
              variant: "warning"
            }
          ]}
        />

        {/* FilterBar */}
        <FilterBar
          filters={filterConfigs}
          values={filtros}
          onFilterChange={(key, value) => setFiltros(prev => ({ ...prev, [key]: value }))}
          onClearAll={() => setFiltros({
            search: "",
            estado: "Todos",
            instalacion: "Todas",
            alerta_os10: "Todas",
            totalCount: filtros.totalCount,
            filteredCount: filtros.totalCount
          })}
          searchPlaceholder="Buscar por nombre, apellido, RUT o email..."
          className="mb-6"
        />

        {/* DataTable */}
        <div className="flex-1 min-h-0">
          <DataTable
            data={guardiasFiltrados}
            columns={columns}
            loading={loading}
            emptyMessage="No hay guardias registrados"
            emptyIcon={Shield}
            onRowClick={(guardia) => {
              console.log(`Ver detalles de guardia ${guardia.id}`);
            }}
            mobileCard={mobileCard}
            className="h-full"
          />
        </div>
      </motion.div>

      {/* Contenedor de toasts */}
      <ToastContainer />
    </>
  );
}

// Confirmación de auditoría completada
console.log("✅ Módulo Guardias implementado con conexión a Neon y alertas OS10"); 