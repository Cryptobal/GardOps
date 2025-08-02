"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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
  Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";

// Componente KPI Box mejorado
const KPIBox = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  trend = null,
  tooltip = ""
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color?: string;
  trend?: { value: number; isPositive: boolean } | null;
  tooltip?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="h-full cursor-help hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {title}
              {tooltip && <Info className="h-3 w-3" />}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
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
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex-shrink-0 ml-3`}>
            <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Componente Combobox para asignación inline
const AsignarGuardiaCombobox = ({ 
  ppc, 
  onAsignar 
}: {
  ppc: any;
  onAsignar: (guardiaId: string) => void;
}) => {
  const [guardias, setGuardias] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    fetchGuardiasDisponibles();
  }, []);

  const fetchGuardiasDisponibles = async () => {
    try {
      const response = await fetch("/api/guardias/disponibles");
      if (response.ok) {
        const data = await response.json();
        setGuardias(data.guardias || []);
      }
    } catch (error) {
      console.error("Error cargando guardias disponibles:", error);
    }
  };

  const handleAsignar = async (guardiaId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/ppc/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ppc_id: ppc.id,
          guardia_id: guardiaId
        })
      });

      if (response.ok) {
        onAsignar(guardiaId);
        setOpen(false);
      }
    } catch (error) {
      console.error("Error asignando guardia:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuardias = guardias.filter(guardia =>
    guardia.nombre_completo.toLowerCase().includes(searchValue.toLowerCase()) ||
    guardia.rut.includes(searchValue)
  );

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => setOpen(!open)}
        className="w-full justify-start"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Asignando...
          </div>
        ) : (
          <>
            <User className="h-3 w-3 mr-2" />
            Asignar guardia
          </>
        )}
      </Button>
      
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
          <div className="p-2 border-b">
            <Input
              placeholder="Buscar guardia..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredGuardias.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No se encontraron guardias.</div>
            ) : (
              filteredGuardias.map((guardia) => (
                <div
                  key={guardia.id}
                  onClick={() => handleAsignar(guardia.id)}
                  className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  <div>
                    <p className="font-medium">{guardia.nombre_completo}</p>
                    <p className="text-xs text-muted-foreground">{guardia.rut}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function PPCPage() {
  const router = useRouter();
  const [ppcs, setPpcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<any>(null);
  const [asignandoId, setAsignandoId] = useState<string | null>(null);

  // Filtros mejorados
  const [filtros, setFiltros] = useState({
    estado: "Pendiente", // Valor por defecto "Abiertos"
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

  // Cargar datos de PPCs
  useEffect(() => {
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

      const response = await fetch(`/api/ppc?${params}`);
      if (!response.ok) throw new Error("Error al cargar PPCs");
      
      const data = await response.json();
      setPpcs(data || []);
    } catch (error) {
      console.error("Error cargando PPCs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetricas = async () => {
    try {
      const response = await fetch("/api/ppc/metricas");
      if (response.ok) {
        const data = await response.json();
        setMetricas(data.metricas);
        setKpis(data.estadisticas);
      }
    } catch (error) {
      console.error("Error cargando métricas:", error);
    }
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

  // Datos para gráfico de líneas (evolución semanal)
  const lineData = metricas?.map((item: any, index: number) => ({
    semana: `Sem ${index + 1}`,
    tasa: item.tasa_ppc,
    abiertos: item.total_abiertos,
    cubiertos: item.total_cubiertos
  })) || [];

  // Calcular días sin cubrir
  const calcularDiasSinCubrir = (ppc: any) => {
    if (!ppc.fecha_creacion) return 0;
    const fechaCreacion = new Date(ppc.fecha_creacion);
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
            <AsignarGuardiaCombobox
              ppc={ppc}
              onAsignar={(guardiaId) => {
                setAsignandoId(ppc.id);
                // Actualizar estado localmente
                setPpcs(prev => prev.map(p => 
                  p.id === ppc.id 
                    ? { ...p, estado: 'Cubierto', guardia_asignado: { id: guardiaId, nombre: 'Guardia asignado' } }
                    : p
                ));
                setAsignandoId(null);
              }}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/ppc/${ppc.id}`)}
              className="text-xs"
            >
              Ver detalle
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Obtener opciones para filtros
  const instalaciones = Array.from(new Set(ppcs.map(p => p.instalacion))).sort();
  const roles = Array.from(new Set(ppcs.map(p => p.rol))).sort();

  const handleAsignarGuardia = (guardiaId: string) => {
    console.log("✅ Guardia asignado exitosamente:", guardiaId);
    fetchPPCs(); // Recargar datos
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
          <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">PPC</h1>
          <p className="text-base text-muted-foreground">Gestiona los puestos por cubrir y sus asignaciones</p>
        </div>
      </div>

      {/* KPIs mejorados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPIBox
          title="PPC Abiertos"
          value={kpis.total_abiertos}
          icon={AlertTriangle}
          color="red"
          tooltip="Puestos por cubrir que requieren asignación inmediata"
        />
        <KPIBox
          title="PPC Cubiertos"
          value={kpis.total_cubiertos}
          icon={CheckCircle}
          color="green"
          tooltip="Puestos por cubrir que ya tienen guardia asignado"
        />
        <KPIBox
          title="Total PPC"
          value={kpis.total_ppc}
          icon={BarChart3}
          color="blue"
          tooltip="Número total de puestos por cubrir en el sistema"
        />
        <KPIBox
          title="Tasa PPC"
          value={`${kpis.tasa_actual}%`}
          icon={AlertTriangle}
          color="orange"
          tooltip="Porcentaje de puestos abiertos vs total"
        />
      </div>

      {/* Gráfico de líneas */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Evolución Semanal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="tasa" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Tasa PPC (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="abiertos" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Abiertos"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filtros mejorados */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Filtros</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredPpcs.length} resultados
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={limpiarFiltros}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Pendiente">Abiertos</SelectItem>
                  <SelectItem value="Cubierto">Cubiertos</SelectItem>
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
              <div className="flex gap-2">
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
          </div>
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
            onRowClick={(ppc) => {
              router.push(`/ppc/${ppc.id}`);
            }}
            mobileCard={(ppc) => (
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
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
                        <AsignarGuardiaCombobox
                          ppc={ppc}
                          onAsignar={(guardiaId) => {
                            setAsignandoId(ppc.id);
                            setPpcs(prev => prev.map(p => 
                              p.id === ppc.id 
                                ? { ...p, estado: 'Cubierto', guardia_asignado: { id: guardiaId, nombre: 'Guardia asignado' } }
                                : p
                            ));
                            setAsignandoId(null);
                          }}
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => router.push(`/ppc/${ppc.id}`)}
                        >
                          Ver detalle
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

      {/* Mensaje de éxito */}
      {(() => {
        console.log("Vista PPC actualizada con nuevo diseño UX/UI y asignación optimizada");
        return null;
      })()}
    </div>
  );
} 