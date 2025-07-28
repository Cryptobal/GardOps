"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, Users, Shield, FileText, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

interface AlertaInstalacion {
  id: string;
  tipo: "Crítica" | "Advertencia" | "Información";
  titulo: string;
  descripcion: string;
  fecha_generada: Date;
  estado: "Activa" | "Resuelta" | "Descartada";
  origen: "Sistema" | "Operativo" | "Documento";
}

interface KPIInstalacion {
  nombre: string;
  valor: number;
  objetivo: number;
  unidad: string;
  tendencia: "up" | "down" | "stable";
  porcentaje_cambio: number;
  icon: React.ComponentType<any>;
  color: string;
}

interface AlertasInstalacionProps {
  instalacionId: string;
  refreshTrigger?: number;
}

export default function AlertasInstalacion({ instalacionId, refreshTrigger }: AlertasInstalacionProps) {
  const [alertas, setAlertas] = useState<AlertaInstalacion[]>([]);
  const [kpis, setKpis] = useState<KPIInstalacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [instalacionId, refreshTrigger]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Simular datos de alertas
      const mockAlertas: AlertaInstalacion[] = [
        {
          id: "1",
          tipo: "Crítica",
          titulo: "Documento vencido",
          descripcion: "El permiso municipal de seguridad ha vencido hace 3 días",
          fecha_generada: new Date("2024-12-20"),
          estado: "Activa",
          origen: "Documento"
        },
        {
          id: "2",
          tipo: "Advertencia",
          titulo: "Puesto descubierto",
          descripcion: "Puesto Principal sin guardia asignado por más de 2 horas",
          fecha_generada: new Date("2024-12-23"),
          estado: "Activa",
          origen: "Operativo"
        },
        {
          id: "3",
          tipo: "Información",
          titulo: "Nuevo documento subido",
          descripcion: "Se ha subido un nuevo certificado de seguridad",
          fecha_generada: new Date("2024-12-22"),
          estado: "Resuelta",
          origen: "Sistema"
        }
      ];

      // Simular KPIs
      const mockKpis: KPIInstalacion[] = [
        {
          nombre: "Cobertura de Puestos",
          valor: 85,
          objetivo: 100,
          unidad: "%",
          tendencia: "down",
          porcentaje_cambio: -5,
          icon: Shield,
          color: "text-amber-600"
        },
        {
          nombre: "Guardias Activos",
          valor: 12,
          objetivo: 15,
          unidad: "guardias",
          tendencia: "up",
          porcentaje_cambio: 8,
          icon: Users,
          color: "text-blue-600"
        },
        {
          nombre: "Documentos Vigentes",
          valor: 8,
          objetivo: 10,
          unidad: "docs",
          tendencia: "stable",
          porcentaje_cambio: 0,
          icon: FileText,
          color: "text-green-600"
        },
        {
          nombre: "Alertas Resueltas",
          valor: 94,
          objetivo: 98,
          unidad: "%",
          tendencia: "up",
          porcentaje_cambio: 12,
          icon: CheckCircle,
          color: "text-purple-600"
        }
      ];

      setAlertas(mockAlertas);
      setKpis(mockKpis);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertaBadge = (tipo: string) => {
    switch (tipo) {
      case "Crítica":
        return <Badge className="bg-red-600">Crítica</Badge>;
      case "Advertencia":
        return <Badge className="bg-amber-600">Advertencia</Badge>;
      case "Información":
        return <Badge className="bg-blue-600">Información</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  const getAlertaIcon = (tipo: string) => {
    switch (tipo) {
      case "Crítica":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "Advertencia":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "Información":
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const formatearFecha = (fecha: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(fecha));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div>
        <h3 className="text-lg font-medium mb-4">Indicadores de Rendimiento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            const porcentaje = Math.round((kpi.valor / kpi.objetivo) * 100);
            
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-opacity-10 ${kpi.color.replace('text-', 'bg-')}`}>
                      <Icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      {getTendenciaIcon(kpi.tendencia)}
                      <span className={`text-xs ${
                        kpi.tendencia === 'up' ? 'text-green-600' : 
                        kpi.tendencia === 'down' ? 'text-red-600' : 
                        'text-muted-foreground'
                      }`}>
                        {kpi.porcentaje_cambio > 0 ? '+' : ''}{kpi.porcentaje_cambio}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{kpi.valor}</span>
                      <span className="text-sm text-muted-foreground">/ {kpi.objetivo} {kpi.unidad}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{kpi.nombre}</span>
                        <span className="text-muted-foreground">{porcentaje}%</span>
                      </div>
                      <Progress 
                        value={porcentaje} 
                        className="h-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Alertas Activas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Alertas Activas</h3>
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {alertas.filter(a => a.estado === "Activa").length} activas
          </Badge>
        </div>

        {alertas.filter(a => a.estado === "Activa").length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay alertas activas
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alertas.filter(a => a.estado === "Activa").map((alerta) => (
              <Card key={alerta.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getAlertaIcon(alerta.tipo)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{alerta.titulo}</h4>
                        <div className="flex items-center gap-2">
                          {getAlertaBadge(alerta.tipo)}
                          <Badge variant="outline" className="text-xs">
                            {alerta.origen}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {alerta.descripcion}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Generada: {formatearFecha(alerta.fecha_generada)}</span>
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:underline">
                            Resolver
                          </button>
                          <button className="text-gray-600 hover:underline">
                            Descartar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Alertas */}
      <div>
        <h3 className="text-lg font-medium mb-4">Historial Reciente</h3>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {alertas.filter(a => a.estado !== "Activa").map((alerta) => (
                <div key={alerta.id} className="flex items-center gap-3 opacity-60">
                  <div className="flex-shrink-0">
                    {getAlertaIcon(alerta.tipo)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{alerta.titulo}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {alerta.estado}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatearFecha(alerta.fecha_generada)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {alertas.filter(a => a.estado !== "Activa").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay historial de alertas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}