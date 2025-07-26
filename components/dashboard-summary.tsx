"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { 
  Users, 
  UserCheck, 
  UserX, 
  Building, 
  AlertCircle,
  PieChart as PieChartIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ResumenOperacional {
  coberturasActivas: number
  guardiasExternos: number
  guardiasContratados: number
  instalacionesIncompletas: number
}

interface TopPpcData {
  instalacion_nombre: string
  ppc_count: number
}

interface DashboardSummaryProps {
  className?: string
}

function SummaryCard({ 
  title, 
  value, 
  icon, 
  color, 
  description,
  delay = 0 
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  description: string
  delay?: number
}) {
  return (
    <motion.div
      className="group p-6 rounded-xl border bg-card/30 backdrop-blur-sm hover:bg-card/60 transition-all duration-300"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center space-x-4">
        <div className={cn(
          "rounded-lg p-3",
          color === "blue" && "bg-blue-500/10 text-blue-600",
          color === "green" && "bg-green-500/10 text-green-600",
          color === "purple" && "bg-purple-500/10 text-purple-600",
          color === "orange" && "bg-orange-500/10 text-orange-600"
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xs text-muted-foreground/80 mt-1">{description}</p>
        </div>
      </div>
    </motion.div>
  )
}

function TopPpcChart({ data }: { data: TopPpcData[] }) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']
  
  return (
    <motion.div
      className="p-6 rounded-xl border bg-card/30 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="rounded-lg p-2 bg-red-500/10">
          <PieChartIcon className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Top 5 Instalaciones - PPC Activos
          </h3>
          <p className="text-sm text-muted-foreground">
            Sitios con mayor cantidad de turnos no cubiertos
          </p>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
            <XAxis type="number" stroke="#888888" fontSize={12} />
            <YAxis 
              type="category" 
              dataKey="instalacion_nombre" 
              stroke="#888888" 
              fontSize={11}
              width={120}
              tick={{ fontSize: 10 }}
            />
            <Bar dataKey="ppc_count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {data.map((item, index) => (
          <div key={item.instalacion_nombre} className="flex items-center space-x-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-muted-foreground">
              {item.instalacion_nombre}: {item.ppc_count} PPC
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function DashboardSummary({ className }: DashboardSummaryProps) {
  const [resumen, setResumen] = React.useState<ResumenOperacional | null>(null)
  const [topPpc, setTopPpc] = React.useState<TopPpcData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard-metrics')
        const data = await response.json()
        
        if (data.success || data.metrics) {
          setResumen(data.metrics.resumenOperacional)
          setTopPpc(data.metrics.topPpcPorInstalacion || [])
        }
      } catch (err) {
        console.error('Error fetching summary data:', err)
        // Fallback con datos mock
        setResumen({
          coberturasActivas: 134,
          guardiasExternos: 18,
          guardiasContratados: 24,
          instalacionesIncompletas: 12
        })
        setTopPpc([
          { instalacion_nombre: 'Plaza Los Leones', ppc_count: 5 },
          { instalacion_nombre: 'Centro Comercial Maipú', ppc_count: 4 },
          { instalacion_nombre: 'Oficinas Santiago Centro', ppc_count: 3 },
          { instalacion_nombre: 'Clínica Las Condes', ppc_count: 2 },
          { instalacion_nombre: 'Universidad de Chile', ppc_count: 2 }
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="h-6 bg-card/50 rounded animate-pulse w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-card/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-card/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!resumen) {
    return (
      <div className={cn("text-center p-8", className)}>
        <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
        <p className="text-muted-foreground">No se pudo cargar el resumen operacional</p>
      </div>
    )
  }

  const summaryCards = [
    {
      title: "Coberturas Activas",
      value: resumen.coberturasActivas,
      icon: <Building className="h-5 w-5" />,
      color: "blue",
      description: "Asignaciones operativas vigentes"
    },
    {
      title: "Guardias Externos",
      value: resumen.guardiasExternos,
      icon: <UserCheck className="h-5 w-5" />,
      color: "green",
      description: "Personal subcontratado activo"
    },
    {
      title: "Guardias Contratados",
      value: resumen.guardiasContratados,
      icon: <Users className="h-5 w-5" />,
      color: "purple",
      description: "Personal de planta en servicio"
    },
    {
      title: "Cobertura Incompleta",
      value: resumen.instalacionesIncompletas,
      icon: <UserX className="h-5 w-5" />,
      color: "orange",
      description: "Instalaciones sin cobertura total"
    }
  ]

  return (
    <div className={cn("space-y-8", className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Resumen Operacional
        </h2>
        <p className="text-muted-foreground">
          Vista consolidada del estado actual de operaciones
        </p>
      </motion.div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <SummaryCard key={card.title} {...card} delay={index * 0.1} />
        ))}
      </div>

      {/* Top PPC Chart */}
      {topPpc.length > 0 && <TopPpcChart data={topPpc} />}
    </div>
  )
} 