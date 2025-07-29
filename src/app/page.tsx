"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Shield, Users, Building2, Calendar, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface AlertaDocumento {
  id: string;
  dias_restantes: number;
}

const statsBase = [
  {
    title: "Guardias Activos",
    value: "24",
    icon: Shield,
    description: "Personal en servicio",
    color: "text-blue-500",
    href: "/guardias",
    urgent: false,
    animate: false
  },
  {
    title: "Clientes",
    value: "12",
    icon: Users,
    description: "Clientes registrados",
    color: "text-green-500",
    href: "/clientes",
    urgent: false,
    animate: false
  },
  {
    title: "Instalaciones",
    value: "18",
    icon: Building2,
    description: "Sitios bajo vigilancia",
    color: "text-purple-500",
    href: "/instalaciones",
    urgent: false,
    animate: false
  },
  {
    title: "Turnos Programados",
    value: "96",
    icon: Clock,
    description: "Para esta semana",
    color: "text-orange-500",
    href: "/turnos-diarios",
    urgent: false,
    animate: false
  }
];

export default function HomePage() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<AlertaDocumento[]>([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
    // Auto-refresh cada 2 minutos
    const interval = setInterval(cargarAlertas, 120000);
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

  // Crear stats dinámicos incluyendo alertas
  const alertaStat = {
    title: "Docs. Vencimiento",
    value: cargandoAlertas ? "..." : totalAlertas.toString(),
    icon: AlertTriangle,
    description: cargandoAlertas ? "Cargando..." : getAlertaDescription(),
    color: getAlertaColor(),
    href: "/alertas",
    urgent: vencidos > 0 || vencenHoy > 0,
    animate: totalAlertas > 0
  };

  const stats = [...statsBase, alertaStat];

  const handleCardClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold heading-gradient">
          Bienvenido a GardOps
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Tu plataforma integral para la gestión profesional de servicios de seguridad,
          control de guardias y supervisión de instalaciones.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.title}>
            <Card 
              className={`card-elegant p-6 hover:scale-105 transition-all duration-300 cursor-pointer ${
                stat.urgent ? 'border-red-500/30 bg-red-500/5' : ''
              } ${
                stat.animate ? 'hover:shadow-lg hover:shadow-red-500/20' : ''
              }`}
              onClick={() => handleCardClick(stat.href)}
              title={`Ir a ${stat.title}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
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
                <stat.icon className={`h-5 w-5 ${stat.color} ${stat.animate ? 'animate-pulse' : ''}`} />
              </CardHeader>
              <CardContent className="p-0">
                <div className={`text-3xl font-bold text-foreground ${stat.urgent ? 'text-red-500' : ''}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
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