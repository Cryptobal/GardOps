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
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";

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

// Componente Modal para Asignar Guardia
const AsignarGuardiaModal = ({ 
  isOpen, 
  onClose, 
  ppc, 
  onAsignar 
}: {
  isOpen: boolean;
  onClose: () => void;
  ppc: any;
  onAsignar: (guardiaId: string) => void;
}) => {
  const [guardias, setGuardias] = useState<any[]>([]);
  const [selectedGuardia, setSelectedGuardia] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGuardiasDisponibles();
    }
  }, [isOpen]);

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

  const handleAsignar = async () => {
    if (!selectedGuardia) return;
    
    setLoading(true);
    try {
      const response = await fetch("/api/ppc/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ppc_id: ppc.id,
          guardia_id: selectedGuardia
        })
      });

      if (response.ok) {
        onAsignar(selectedGuardia);
        onClose();
      }
    } catch (error) {
      console.error("Error asignando guardia:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

      return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg p-4 md:p-6 w-full max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-4">Asignar Guardia</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Selecciona un guardia para asignar al PPC de {ppc?.instalacion}
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Guardia</label>
            <select
              value={selectedGuardia}
              onChange={(e) => setSelectedGuardia(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="">Seleccionar guardia...</option>
              {guardias.map((guardia) => (
                <option key={guardia.id} value={guardia.id}>
                  {guardia.nombre_completo} - {guardia.rut}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAsignar}
              disabled={!selectedGuardia || loading}
              className="flex-1"
            >
              {loading ? "Asignando..." : "Asignar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PPCPage() {
  const router = useRouter();
  const [ppcs, setPpcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<any>(null);
  const [modalAsignar, setModalAsignar] = useState<{ isOpen: boolean; ppc: any }>({
    isOpen: false,
    ppc: null
  });

  // Filtros
  const [filtros, setFiltros] = useState({
    estado: "all",
    instalacion: "all",
    rol: "all",
    prioridad: "all",
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

  // Filtrar PPCs
  const filteredPpcs = useMemo(() => {
    return ppcs;
  }, [ppcs]);

  // Columnas de la tabla
  const columns: Column<any>[] = [
    {
      key: "instalacion",
      label: "Instalación",
      render: (ppc) => (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium">{ppc.instalacion}</p>
            <p className="text-sm text-muted-foreground">{ppc.rol}</p>
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
      render: (ppc) => (
        <Badge variant={ppc.estado === 'Pendiente' ? 'destructive' : 'default'}>
          {ppc.estado === 'Pendiente' ? 'Abierto' : 'Cubierto'}
        </Badge>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (ppc) => (
        <div className="flex flex-col sm:flex-row gap-2">
          {ppc.estado === 'Pendiente' ? (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setModalAsignar({ isOpen: true, ppc });
              }}
              className="text-xs sm:text-sm"
            >
              Asignar guardia
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                // Ver detalle del PPC cubierto
                console.log("Ver detalle PPC:", ppc.id);
              }}
              className="text-xs sm:text-sm"
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
      <div className="container mx-auto p-3 md:p-6 space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 md:space-x-4 mb-4 md:mb-6">
        <div className="p-2 md:p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
          <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">PPC</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gestiona los puestos por cubrir y sus asignaciones</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <KPIBox
          title="PPC Abiertos"
          value={kpis.total_abiertos}
          icon={AlertTriangle}
          color="red"
        />
        <KPIBox
          title="PPC Cubiertos"
          value={kpis.total_cubiertos}
          icon={CheckCircle}
          color="green"
        />
        <KPIBox
          title="Total PPC"
          value={kpis.total_ppc}
          icon={BarChart3}
          color="blue"
        />
        <KPIBox
          title="Tasa PPC"
          value={`${kpis.tasa_actual}%`}
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      {/* Gráfico de Métricas */}
      {metricas && (
        <Card>
          <CardContent className="p-3 md:p-6">
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Evolución Tasa PPC (Últimas 6 semanas)</h3>
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tasa_ppc" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 md:p-6">
          <div className="flex items-center space-x-2 mb-3 md:mb-4">
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
            <h3 className="text-base md:text-lg font-semibold">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="Pendiente">Abiertos</option>
                <option value="Cubierto">Cubiertos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Instalación</label>
              <select
                value={filtros.instalacion}
                onChange={(e) => setFiltros(prev => ({ ...prev, instalacion: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">Todas las instalaciones</option>
                {instalaciones.map((instalacion) => (
                  <option key={instalacion} value={instalacion}>
                    {instalacion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rol de Servicio</label>
              <select
                value={filtros.rol}
                onChange={(e) => setFiltros(prev => ({ ...prev, rol: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">Todos los roles</option>
                {roles.map((rol) => (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prioridad</label>
              <select
                value={filtros.prioridad}
                onChange={(e) => setFiltros(prev => ({ ...prev, prioridad: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">Todas las prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fecha desde</label>
              <Input
                type="date"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaDesde: e.target.value }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fecha hasta</label>
              <Input
                type="date"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaHasta: e.target.value }))}
                className="w-full"
              />
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
              console.log("Ver detalles de PPC", ppc.id);
            }}
            mobileCard={(ppc) => (
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{ppc.instalacion}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{ppc.rol}</p>
                    </div>
                    <Badge variant={ppc.estado === 'Pendiente' ? 'destructive' : 'default'} className="text-xs">
                      {ppc.estado === 'Pendiente' ? 'Abierto' : 'Cubierto'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm">Jornada:</span>
                      <Badge variant={ppc.jornada === 'N' ? 'secondary' : 'default'} className="text-xs">
                        {ppc.jornada}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm">ROL:</span>
                      <span className="text-xs md:text-sm font-medium truncate">{ppc.rol_tipo}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      <span className="text-xs md:text-sm">{ppc.horario}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-2">
                      {ppc.guardia_asignado ? (
                        <>
                          <User className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                          <span className="text-xs md:text-sm font-medium truncate">{ppc.guardia_asignado.nombre}</span>
                        </>
                      ) : (
                        <span className="text-xs md:text-sm text-muted-foreground">Sin guardia asignado</span>
                      )}
                    </div>
                    
                    <div className="pt-2">
                      {ppc.estado === 'Pendiente' ? (
                        <Button
                          size="sm"
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalAsignar({ isOpen: true, ppc });
                          }}
                        >
                          Asignar guardia
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Ver detalle PPC:", ppc.id);
                          }}
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

      {/* Modal Asignar Guardia */}
      <AsignarGuardiaModal
        isOpen={modalAsignar.isOpen}
        onClose={() => setModalAsignar({ isOpen: false, ppc: null })}
        ppc={modalAsignar.ppc}
        onAsignar={handleAsignarGuardia}
      />

      {/* Mensaje de éxito */}
      {console.log("✅ Página PPC creada con éxito - 100% responsive")}
    </div>
  );
} 