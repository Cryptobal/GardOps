import { Authorize, GuardButton, can } from '@/lib/authz-ui'
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Settings, 
  DollarSign, 
  FileText, 
  TrendingUp,
  Users,
  Building,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function PayrollPage() {
  const payrollModules = [
    {
      title: 'Ítems Globales',
      description: 'Administra los ítems de sueldo disponibles para las estructuras de servicio',
      icon: DollarSign,
      href: '/payroll/items-globales',
      status: 'active',
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Items Extras',
      description: 'Gestiona bonos, descuentos y otros ítems extras por guardia',
      icon: FileText,
      href: '/payroll/items-extras',
      status: 'active',
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      title: 'Estructuras de Servicio',
      description: 'Configura las estructuras salariales por instalación y rol',
      icon: Building,
      href: '/payroll/estructuras',
      status: 'active',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: 'Estructuras por Guardia',
      description: 'Gestiona las estructuras salariales personalizadas por guardia',
      icon: Users,
      href: '/payroll/estructuras-guardia',
      status: 'active',
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Cálculo de Sueldos',
      description: 'Genera y revisa los cálculos salariales de los guardias',
      icon: Calculator,
      href: '/payroll/calculos',
      status: 'coming-soon',
      color: 'bg-purple-50 border-purple-200'
    },
    {
      title: 'Planillas',
      description: 'Gestiona las planillas de pago y reportes',
      icon: FileText,
      href: '/planillas',
      status: 'active',
      color: 'bg-orange-50 border-orange-200'
    },
    {
      title: 'Parámetros Generales',
      description: 'Configura AFP, ISAPRE, impuestos y otros parámetros',
      icon: Settings,
      href: '/payroll/parametros',
      status: 'coming-soon',
      color: 'bg-gray-50 border-gray-200'
    },
    {
      title: 'Reportes',
      description: 'Genera reportes y análisis de costos laborales',
      icon: TrendingUp,
      href: '/payroll/reportes',
      status: 'coming-soon',
      color: 'bg-indigo-50 border-indigo-200'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Módulo de Payroll</h1>
        <p className="text-muted-foreground">
          Administra todos los aspectos relacionados con la nómina y remuneraciones
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Guardias Activos</p>
                <p className="text-2xl font-bold text-foreground">247</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Instalaciones</p>
                <p className="text-2xl font-bold text-foreground">18</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bonos Configurados</p>
                <p className="text-2xl font-bold text-foreground">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Período Actual</p>
                <p className="text-2xl font-bold text-foreground">Ene 2025</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Módulos de Payroll */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Módulos Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payrollModules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Card key={module.title} className="bg-card border-border hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <IconComponent className="h-6 w-6 text-muted-foreground" />
                    <Badge 
                      variant={module.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {module.status === 'active' ? 'Disponible' : 'Próximamente'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-foreground">{module.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {module.status === 'active' ? (
                    <Link href={module.href}>
                      <Button className="w-full" variant="outline">
                        Acceder
                      </Button>
                    </Link>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Próximamente
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Información adicional */}
      <Card className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-200/50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800/50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-foreground mb-2">
                  Sistema de Payroll Integrado
                </h3>
                <p className="text-muted-foreground mb-4">
                El módulo de payroll está diseñado para manejar todos los aspectos de la nómina, 
                desde la configuración de bonos hasta la generación de planillas. Cada sección 
                está optimizada para facilitar la administración de remuneraciones.
              </p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-foreground">✓ Configuración Flexible</p>
                    <p className="text-muted-foreground">Bonos y estructuras personalizables</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">✓ Cálculos Automáticos</p>
                    <p className="text-muted-foreground">Procesamiento automático de nómina</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">✓ Reportes Detallados</p>
                    <p className="text-muted-foreground">Análisis completo de costos</p>
                  </div>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
