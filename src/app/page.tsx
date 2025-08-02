"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Shield, Users, Building2, Calendar, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface AlertaDocumento {
  id: string;
  dias_restantes: number;
}

const statsBase = [
  {
    title: "Clientes Activos",
    value: "0",
    icon: Users,
    description: "Clientes operativos",
    color: "text-green-500",
    href: "/clientes",
    urgent: false,
    animate: false
  },
  {
    title: "Instalaciones Activas",
    value: "0",
    icon: Building2,
    description: "Sitios operativos",
    color: "text-purple-500",
    href: "/instalaciones",
    urgent: false,
    animate: false
  },
  {
    title: "Puestos Activos",
    value: "0",
    icon: Shield,
    description: "Puestos de trabajo",
    color: "text-blue-500",
    href: "/instalaciones",
    urgent: false,
    animate: false
  },
  {
    title: "Total PPC",
    value: "0 (0%)",
    icon: Clock,
    description: "Pendientes de completar",
    color: "text-orange-500",
    href: "/instalaciones",
    urgent: false,
    animate: false
  },
  {
    title: "Documentos Vencidos",
    value: "0",
    icon: AlertTriangle,
    description: "Documentos por vencer",
    color: "text-red-500",
    href: "/documentos",
    urgent: true,
    animate: false
  }
];

export default function HomePage() {
  console.log('🔍 HomePage: Componente iniciando...')
  
  const router = useRouter();
  const [alertas, setAlertas] = useState<AlertaDocumento[]>([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [kpis, setKpis] = useState({
    clientesActivos: 0,
    instalacionesActivas: 0,
    puestosActivos: 0,
    totalPPC: 0,
    documentosVencidos: 0
  });

  const cargarKPIs = async () => {
    try {
      // Cargar datos de clientes
      const clientesResponse = await fetch("/api/clientes");
      const clientesData = await clientesResponse.json();
      const clientesActivos = clientesData.success ? 
        clientesData.data.filter((c: any) => c.estado === "Activo").length : 0;

      // Cargar datos de instalaciones con parámetro simple
      const instalacionesResponse = await fetch("/api/instalaciones?simple=true");
      const instalacionesData = await instalacionesResponse.json();
      const instalacionesActivas = instalacionesData.success ? 
        instalacionesData.data.filter((i: any) => i.estado === "Activo").length : 0;

      // Calcular puestos activos y PPC
      let puestosActivos = 0;
      let totalPPC = 0;
      if (instalacionesData.success) {
        puestosActivos = instalacionesData.data.reduce((sum: number, i: any) => {
          return sum + (parseInt(i.puestos_creados) || 0);
        }, 0);
        
        totalPPC = instalacionesData.data.reduce((sum: number, i: any) => {
          return sum + (parseInt(i.ppc_pendientes) || 0);
        }, 0);
      }

      // Por ahora, usar un valor fijo para documentos vencidos hasta arreglar la API
      const documentosVencidos = 0;

      setKpis({
        clientesActivos,
        instalacionesActivas,
        puestosActivos,
        totalPPC,
        documentosVencidos
      });

    } catch (error) {
      console.error('Error cargando KPIs:', error);
      // En caso de error, usar valores por defecto
      setKpis({
        clientesActivos: 0,
        instalacionesActivas: 0,
        puestosActivos: 0,
        totalPPC: 0,
        documentosVencidos: 0
      });
    }
  };

  const cargarAlertas = async () => {
    try {
      setCargandoAlertas(true);
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/alertas-documentos?_t=${timestamp}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAlertas(data.data || []);
      } else {
        console.error('Error cargando alertas para dashboard:', data.error);
        setAlertas([]);
      }
    } catch (error) {
      console.error('Error de conexión alertas dashboard:', error);
      setAlertas([]);
    } finally {
      setCargandoAlertas(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    console.log('🔍 HomePage: useEffect ejecutándose...')
    cargarAlertas();
    cargarKPIs();
    // Auto-refresh cada 2 minutos
    const interval = setInterval(() => {
      cargarAlertas();
      cargarKPIs();
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  // Calcular estadísticas de vencimientos
  const vencidos = alertas.filter(a => a.dias_restantes < 0).length;
  const vencenHoy = alertas.filter(a => a.dias_restantes === 0).length;
  const criticos = alertas.filter(a => a.dias_restantes > 0 && a.dias_restantes <= 7).length;
  const totalAlertas = alertas.length;

  const getAlertaColor = () => {
    if (vencidos > 0 || vencenHoy > 0) return "text-red-500";
    if (criticos > 0) return "text-orange-500";
    if (totalAlertas > 0) return "text-yellow-500";
    return "text-green-500";
  };

  const getAlertaDescription = () => {
    if (vencidos > 0) return `${vencidos} vencidos, ${criticos} críticos`;
    if (vencenHoy > 0) return `${vencenHoy} vencen hoy, ${criticos} críticos`;
    if (criticos > 0) return `${criticos} críticos (≤7 días)`;
    if (totalAlertas > 0) return "Próximos a vencer";
    return "Todo al día";
  };

  // Generar stats dinámicamente basado en datos reales
  const stats = useMemo(() => {
    return statsBase.map(stat => {
      if (stat.title === "Clientes Activos") {
        return {
          ...stat,
          value: kpis.clientesActivos.toString()
        };
      }
      if (stat.title === "Instalaciones Activas") {
        return {
          ...stat,
          value: kpis.instalacionesActivas.toString()
        };
      }
      if (stat.title === "Puestos Activos") {
        return {
          ...stat,
          value: kpis.puestosActivos.toString()
        };
      }
      if (stat.title === "Total PPC") {
        const porcentaje = kpis.puestosActivos > 0 ? Math.round((kpis.totalPPC / kpis.puestosActivos) * 100) : 0;
        return {
          ...stat,
          value: `${kpis.totalPPC} (${porcentaje}%)`
        };
      }
      if (stat.title === "Documentos Vencidos") {
        return {
          ...stat,
          value: kpis.documentosVencidos.toString(),
          urgent: kpis.documentosVencidos > 0,
          animate: kpis.documentosVencidos > 0
        };
      }
      return stat;
    });
  }, [kpis]);

  const handleCardClick = (href: string) => {
    router.push(href);
  };

  console.log('🔍 HomePage: Renderizando página principal...')
  
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold heading-gradient">
          Bienvenido a GardOps
        </h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Tu plataforma integral para la gestión profesional de servicios de seguridad,
          control de guardias y supervisión de instalaciones.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 auto-rows-fr">
        {stats.map((stat) => (
          <div key={stat.title} className="h-full">
            <Card 
              className={`card-elegant p-3 md:p-6 hover:scale-105 transition-all duration-300 cursor-pointer h-full ${
                stat.urgent ? 'border-red-500/30 bg-red-500/5' : ''
              } ${
                stat.animate ? 'hover:shadow-lg hover:shadow-red-500/20' : ''
              }`}
              onClick={() => handleCardClick(stat.href)}
              title={`Ir a ${stat.title}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground min-h-[1.5rem] flex items-center">
                  {stat.title}
                  {stat.urgent && (
                    <span className="ml-1 inline-flex items-center">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    </span>
                  )}
                </CardTitle>
                <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color} ${stat.animate ? 'animate-pulse' : ''} flex-shrink-0`} />
              </CardHeader>
              <CardContent className="p-0 flex flex-col justify-between h-full">
                <div className={`text-xl md:text-3xl font-bold text-foreground ${stat.urgent ? 'text-red-500' : ''}`}>
                  {stat.value}
                </div>
                {stat.title === "Docs. Vencimiento" && totalAlertas > 0 && (
                  <div className="mt-2 text-xs">
                    <div className="flex gap-2 flex-wrap">
                      {vencidos > 0 && (
                        <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                          {vencidos} vencidos
                        </span>
                      )}
                      {vencenHoy > 0 && (
                        <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                          {vencenHoy} hoy
                        </span>
                      )}
                      {criticos > 0 && (
                        <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                          {criticos} críticos
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Acciones Rápidas
              {totalAlertas > 0 && (
                <span className="ml-2 bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs">
                  {totalAlertas} alertas activas
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Funciones principales de gestión de GardOps
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Gestión de Personal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Asignación de guardias</li>
                <li>• Control de turnos</li>
                <li>• Evaluación de desempeño</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Supervisión</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Monitoreo en tiempo real</li>
                <li>• Reportes de incidencias</li>
                <li>• Alertas automáticas</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                Documentación
                {totalAlertas > 0 && (
                  <span className="text-red-400 text-xs">({totalAlertas} alertas)</span>
                )}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Gestión de clientes</li>
                <li>• Control de instalaciones</li>
                <li>• Documentación y PPC</li>
                <li 
                  className="cursor-pointer hover:text-blue-400 transition-colors"
                  onClick={() => router.push('/alertas')}
                >
                  • Vencimientos y alertas {totalAlertas > 0 && '🔴'}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 