"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
  Shield, 
  Building2, 
  AlertTriangle, 
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardMetrics {
  guardiasEnTurno: number
  instalacionesOperativas: number  
  turnosNoCubiertos: number
  instalacionesCriticas: number
  resumenOperacional: {
    coberturasActivas: number
    guardiasExternos: number
    guardiasContratados: number
    instalacionesIncompletas: number
  }
}

interface KpiCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: string
  description: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  delay?: number
}

function KpiCard({ title, value, icon, color, description, trend, trendValue, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      {/* Gradient background effect */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300",
        color === "blue" && "bg-gradient-to-br from-blue-500 to-blue-600",
        color === "green" && "bg-gradient-to-br from-green-500 to-green-600", 
        color === "red" && "bg-gradient-to-br from-red-500 to-red-600",
        color === "yellow" && "bg-gradient-to-br from-yellow-500 to-yellow-600"
      )} />
      
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "rounded-xl p-3 shadow-lg",
            color === "blue" && "bg-blue-500/10 text-blue-600 shadow-blue-500/20",
            color === "green" && "bg-green-500/10 text-green-600 shadow-green-500/20",
            color === "red" && "bg-red-500/10 text-red-600 shadow-red-500/20", 
            color === "yellow" && "bg-yellow-500/10 text-yellow-600 shadow-yellow-500/20"
          )}>
            {icon}
          </div>
          
          {trend && trendValue && (
            <div className={cn(
              "flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full",
              trend === 'up' && "bg-green-500/10 text-green-600",
              trend === 'down' && "bg-red-500/10 text-red-600",
              trend === 'stable' && "bg-gray-500/10 text-gray-600"
            )}>
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend === 'stable' && <Activity className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
          <motion.p 
            className={cn(
              "text-3xl font-bold tracking-tight",
              color === "blue" && "text-blue-600",
              color === "green" && "text-green-600",
              color === "red" && "text-red-600",
              color === "yellow" && "text-yellow-600"
            )}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.2 }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </motion.p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-pulse" />
      </div>
    </motion.div>
  )
}

interface DashboardKpisProps {
  className?: string
}

export function DashboardKpis({ className }: DashboardKpisProps) {
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/dashboard-metrics')
        const data = await response.json()
        
        if (data.success) {
          setMetrics(data.metrics)
        } else {
          // Usar datos mock si hay error pero están disponibles
          if (data.metrics) {
            setMetrics(data.metrics)
          } else {
            setError('Error al cargar métricas')
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err)
        setError('Error de conexión')
        
        // Fallback con datos mock
        setMetrics({
          guardiasEnTurno: 42,
          instalacionesOperativas: 156,
          turnosNoCubiertos: 8,
          instalacionesCriticas: 3,
          resumenOperacional: {
            coberturasActivas: 134,
            guardiasExternos: 18,
            guardiasContratados: 24,
            instalacionesIncompletas: 12
          }
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-card/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={cn("text-center p-8", className)}>
        <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
        <p className="text-muted-foreground">No se pudieron cargar las métricas</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    )
  }

  const kpis = [
    {
      title: "Guardias en Turno",
      value: metrics.guardiasEnTurno,
      icon: <Shield className="h-6 w-6" />,
      color: "blue" as const,
      description: "Personal activo en operaciones",
      trend: "stable" as const,
      trendValue: "Activo"
    },
    {
      title: "Instalaciones Operativas", 
      value: metrics.instalacionesOperativas,
      icon: <Building2 className="h-6 w-6" />,
      color: "green" as const,
      description: "Sitios con cobertura activa",
      trend: "up" as const,
      trendValue: "+2.3%"
    },
         {
       title: "Turnos no Cubiertos",
       value: metrics.turnosNoCubiertos,
       icon: <Clock className="h-6 w-6" />,
       color: "yellow" as const,
       description: "PPC pendientes de asignación",
       trend: "stable" as const,
       trendValue: metrics.turnosNoCubiertos > 10 ? "Alta" : "Normal"
     },
     {
       title: "Instalaciones Críticas",
       value: metrics.instalacionesCriticas,
       icon: <AlertTriangle className="h-6 w-6" />,
       color: "red" as const,
       description: "Sitios con 2+ PPC activos",
       trend: "stable" as const,
       trendValue: metrics.instalacionesCriticas > 5 ? "Crítico" : "Controlado"
     }
  ]

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {kpis.map((kpi, index) => (
        <KpiCard key={kpi.title} {...kpi} delay={index * 0.1} />
      ))}
    </div>
  )
} 