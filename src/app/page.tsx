"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Shield, Users, Building2, Calendar, Clock, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Guardias Activos",
    value: "24",
    icon: Shield,
    description: "Personal en servicio",
    color: "text-blue-500"
  },
  {
    title: "Clientes",
    value: "12",
    icon: Users,
    description: "Clientes registrados",
    color: "text-green-500"
  },
  {
    title: "Instalaciones",
    value: "18",
    icon: Building2,
    description: "Sitios bajo vigilancia",
    color: "text-purple-500"
  },
  {
    title: "Turnos Programados",
    value: "96",
    icon: Clock,
    description: "Para esta semana",
    color: "text-orange-500"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Welcome Section */}
      <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <h2 className="text-4xl font-bold heading-gradient">
          Bienvenido a GardOps
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Tu plataforma integral para la gestión profesional de servicios de seguridad,
          control de guardias y supervisión de instalaciones.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            className="animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Card className="card-elegant p-6 hover:scale-105 transition-transform duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms' }}>
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Acciones Rápidas
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
              <h4 className="font-medium text-foreground">Administración</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Gestión de clientes</li>
                <li>• Control de instalaciones</li>
                <li>• Documentación y PPC</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 