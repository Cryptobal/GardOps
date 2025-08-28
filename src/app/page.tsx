"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Shield, Users, Building2, Calendar, Clock, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import TurnosExtrasSummary from "../components/dashboard/TurnosExtrasSummary";

interface AlertaDocumento {
  id: string;
  dias_restantes: number;
}

interface TurnosExtrasStats {
  total: number;
  pendientes: number;
  montoPendiente: number;
}

const statsBase = [
  {
    title: "👥 Clientes Activos",
    value: "0",
    icon: Users,
    description: "Clientes operativos",
    color: "text-green-500",
    href: "/clientes",
    urgent: false,
    animate: false
  },
  {
    title: "🏢 Instalaciones Activas",
    value: "0",
    icon: Building2,
    description: "Sitios operativos",
    color: "text-purple-500",
    href: "/instalaciones",
    urgent: false,
    animate: false
  },
  {
    title: "🛡️ Guardias Activos",
    value: "0",
    icon: Shield,
    description: "Guardias operativos",
    color: "text-blue-500",
    href: "/guardias",
    urgent: false,
    animate: false
  },
  {
    title: "⏰ Total PPC",
    value: "0 (0%)",
    icon: Clock,
    description: "Pendientes de completar",
    color: "text-orange-500",
    href: "/instalaciones",
    urgent: false,
    animate: false
  },
  {
    title: "⚠️ Documentos Vencidos",
    value: "0",
    icon: AlertTriangle,
    description: "Documentos por vencer",
    color: "text-red-500",
    href: "/documentos",
    urgent: true,
    animate: false
  },
  {
    title: "💰 Turnos Extras por Pagar",
    value: "0",
    subtitle: "$0",
    icon: DollarSign,
    description: "Turnos pendientes de pago",
    color: "text-yellow-500",
    href: "/pauta-diaria/turnos-extras",
    urgent: false,
    animate: false
  }
];

import { usePermissions } from "@/lib/use-permissions";

export default function HomePage() {
  // Hook de permiso optimizado (siempre llamado, nunca condicional)
  const { allowed: canSeeHome, loading: permissionsLoading } = usePermissions('home.view');

  const router = useRouter();
  const [alertas, setAlertas] = useState<AlertaDocumento[]>([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [kpis, setKpis] = useState({
    clientesActivos: 0,
    instalacionesActivas: 0,
    puestosActivos: 0,
    totalPPC: 0,
    documentosVencidos: 0,
    turnosExtrasPendientes: 0,
    montoTurnosExtrasPendientes: 0
  });

  const cargarKPIs = async () => {
    try {
      // Usar la API simplificada temporalmente hasta resolver autenticación
      const response = await fetch("/api/dashboard/kpis-simple");
      const data = await response.json();
      
      if (data.success) {
        setKpis(data.data);
      } else {
        console.error('Error cargando KPIs:', data.error);
        // En caso de error, usar valores por defecto
        setKpis({
          clientesActivos: 0,
          instalacionesActivas: 0,
          puestosActivos: 0,
          totalPPC: 0,
          documentosVencidos: 0,
          turnosExtrasPendientes: 0,
          montoTurnosExtrasPendientes: 0
        });
      }
    } catch (error) {
      console.error('Error cargando KPIs:', error);
      // En caso de error, usar valores por defecto
      setKpis({
        clientesActivos: 0,
        instalacionesActivas: 0,
        puestosActivos: 0,
        totalPPC: 0,
        documentosVencidos: 0,
        turnosExtrasPendientes: 0,
        montoTurnosExtrasPendientes: 0
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
  const vencidos = alertas.filter((a: AlertaDocumento) => a.dias_restantes < 0).length;
  const vencenHoy = alertas.filter((a: AlertaDocumento) => a.dias_restantes === 0).length;
  const criticos = alertas.filter((a: AlertaDocumento) => a.dias_restantes > 0 && a.dias_restantes <= 7).length;
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
      if (stat.title === "👥 Clientes Activos") {
        return {
          ...stat,
          value: kpis.clientesActivos.toString()
        };
      }
      if (stat.title === "🏢 Instalaciones Activas") {
        return {
          ...stat,
          value: kpis.instalacionesActivas.toString()
        };
      }
      if (stat.title === "🛡️ Guardias Activos") {
        return {
          ...stat,
          value: kpis.puestosActivos.toString()
        };
      }
      if (stat.title === "⏰ Total PPC") {
        const porcentaje = kpis.puestosActivos > 0 ? Math.round((kpis.totalPPC / kpis.puestosActivos) * 100) : 0;
        return {
          ...stat,
          value: `${kpis.totalPPC} (${porcentaje}%)`,
          description: porcentaje > 0 ? `${porcentaje}% de guardias con PPC pendiente` : "Todos los PPC al día",
          urgent: porcentaje > 10,
          animate: porcentaje > 10
        };
      }
      if (stat.title === "⚠️ Documentos Vencidos") {
        return {
          ...stat,
          value: kpis.documentosVencidos.toString(),
          description: kpis.documentosVencidos > 0 ? "Documentos por vencer" : "Todos los documentos al día",
          urgent: kpis.documentosVencidos > 0,
          animate: kpis.documentosVencidos > 0
        };
      }
      if (stat.title === "💰 Turnos Extras por Pagar") {
        return {
          ...stat,
          value: kpis.turnosExtrasPendientes.toString(),
          subtitle: kpis.montoTurnosExtrasPendientes > 0 ? `$${kpis.montoTurnosExtrasPendientes.toLocaleString()}` : "Sin turnos pendientes",
          description: kpis.turnosExtrasPendientes > 0 ? "Turnos pendientes de pago" : "Todos los turnos pagados",
          urgent: kpis.turnosExtrasPendientes > 0,
          animate: kpis.turnosExtrasPendientes > 0
        };
      }
      return stat;
    });
  }, [kpis]);

  const handleCardClick = (href: string) => {
    router.push(href);
  };
  
  // Mostrar loading mientras se verifican los permisos
  if (permissionsLoading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          Cargando permisos...
        </div>
      </div>
    );
  }
  
  if (!canSeeHome) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Acceso denegado
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Welcome Section - Responsive */}
      <div className="text-center space-y-3 sm:space-y-4 px-2 sm:px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold heading-gradient leading-tight">
          Bienvenido a GardOps
        </h2>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed">
          Tu plataforma integral para la gestión profesional de servicios de seguridad,
          control de guardias y supervisión de instalaciones.
        </p>
      </div>

      {/* Stats Grid - mobile-first: 2 cols en xs, 3 en sm+, auto-rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 auto-rows-fr">
        {stats.map((stat) => (
          <div key={stat.title} className="h-full min-h-[140px] sm:min-h-[160px]">
            <Card 
              className={`card-elegant p-3 sm:p-4 md:p-5 lg:p-6 hover:scale-[1.02] sm:hover:scale-[1.03] md:hover:scale-105 transition-all duration-300 cursor-pointer h-full touch-manipulation ${
                stat.urgent ? 'border-red-500/30 bg-red-500/5' : ''
              } ${
                stat.animate ? 'hover:shadow-lg hover:shadow-red-500/20' : ''
              }`}
              onClick={() => handleCardClick(stat.href)}
              title={`Ir a ${stat.title}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm lg:text-base font-medium text-muted-foreground min-h-[1.5rem] sm:min-h-[1.75rem] md:min-h-[2rem] flex items-center leading-tight pr-1">
                  <span className="line-clamp-2">{stat.title}</span>
                  {stat.urgent && (
                    <span className="ml-1 inline-flex items-center">
                      <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500"></span>
                      </span>
                    </span>
                  )}
                </CardTitle>
                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 ${stat.color} ${stat.animate ? 'animate-pulse' : ''} flex-shrink-0`} />
              </CardHeader>
              <CardContent className="p-0 flex flex-col justify-between h-full">
                <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground ${stat.urgent ? 'text-red-500' : ''} truncate`}>
                  {stat.value}
                </div>
                {stat.subtitle && (
                  <div className="text-sm sm:text-base md:text-lg font-semibold text-muted-foreground mt-1">
                    {stat.subtitle}
                  </div>
                )}
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

      {/* Turnos Extras Summary */}
      <TurnosExtrasSummary />

      {/* Quick Actions - Ultra Responsive */}
      <div className="w-full">
        <Card className="card-elegant overflow-hidden">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold flex flex-wrap items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-500" />
              <span>Acciones Rápidas</span>
              {totalAlertas > 0 && (
                <span className="ml-auto sm:ml-2 bg-red-500/20 text-red-400 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs">
                  {totalAlertas} alertas activas
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm md:text-base mt-1">
              Funciones principales de gestión de GardOps
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              <div className="space-y-2 sm:space-y-3 md:space-y-4 p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <h4 className="font-medium text-sm sm:text-base md:text-lg text-foreground flex items-center gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                  Gestión de Personal
                </h4>
                <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Asignación de guardias</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Control de turnos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Evaluación de desempeño</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2 sm:space-y-3 md:space-y-4 p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <h4 className="font-medium text-sm sm:text-base md:text-lg text-foreground flex items-center gap-2">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                  Supervisión
                </h4>
                <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Monitoreo en tiempo real</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Reportes de incidencias</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Alertas automáticas</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2 sm:space-y-3 md:space-y-4 p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors sm:col-span-2 md:col-span-1">
                <h4 className="font-medium text-sm sm:text-base md:text-lg text-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                  Documentación
                  {totalAlertas > 0 && (
                    <span className="text-red-400 text-[10px] sm:text-xs">({totalAlertas} alertas)</span>
                  )}
                </h4>
                <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Gestión de clientes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Control de instalaciones</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>Documentación y PPC</span>
                  </li>
                  <li 
                    className="cursor-pointer hover:text-blue-400 transition-colors flex items-start touch-manipulation active:scale-95"
                    onClick={() => router.push('/alertas')}
                  >
                    <span className="mr-1">•</span>
                    <span>Vencimientos y alertas {totalAlertas > 0 && '🔴'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 