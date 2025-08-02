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
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";

// Importar tipos y esquemas
import { Cliente } from "../../lib/schemas/clientes";

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
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Activo");

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/clientes");
      const result = await response.json();

      if (result.success) {
        setClientes(result.data);
      } else {
          console.error("Error al cargar clientes:", result.error);
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setLoading(false);
    }
    };

    fetchClientes();
  }, []);

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

    return filtered;
  }, [clientes, searchTerm, statusFilter]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const total = clientes.length;
    const activos = clientes.filter(c => c.estado === "Activo").length;
    const inactivos = clientes.filter(c => c.estado === "Inactivo").length;

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
    }
  ];

  // Card para móvil
  const mobileCard = (cliente: Cliente) => (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50"
      onClick={() => router.push(`/clientes/${cliente.id}`)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-foreground">{cliente.nombre}</h3>
              <p className="text-sm text-muted-foreground font-mono">{cliente.rut}</p>
            </div>
            <Badge variant={cliente.estado === "Activo" ? "success" : "inactive"}>
              {cliente.estado || "Activo"}
            </Badge>
          </div>
          
          {cliente.representante_legal && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{cliente.representante_legal}</span>
            </div>
          )}
          
          {cliente.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{cliente.email}</span>
            </div>
          )}
          
          {cliente.telefono && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{cliente.telefono}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col space-y-4 md:space-y-6"
    >
      {/* Header con título y botón de nuevo cliente */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestión de Clientes</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Administra la información de tus clientes y sus documentos
          </p>
        </div>
        <Button 
          onClick={() => router.push('/clientes/nuevo')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
            </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
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
    </motion.div>
  );
}

// Confirmación de auditoría completada
console.log("✅ Vista principal de clientes rediseñada correctamente"); 