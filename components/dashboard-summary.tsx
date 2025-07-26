"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
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
  
  // Ensure data is properly formatted and convert ppc_count to numbers
  const chartData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return []
    
    return data.map(item => ({
      ...item,
      ppc_count: typeof item.ppc_count === 'string' ? parseInt(item.ppc_count) || 0 : (item.ppc_count || 0),
      instalacion_nombre: item.instalacion_nombre || 'Sin nombre'
    })).filter(item => item.ppc_count > 0)
  }, [data])
  

  
  if (!chartData || chartData.length === 0) {
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
        <div style={{ height: '320px' }} className="flex items-center justify-center">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </motion.div>
    )
  }
  
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
      
      <div className="w-full bg-background" style={{ height: '320px', minHeight: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="horizontal" 
            margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
            barCategoryGap="15%"
          >
            <XAxis 
              type="number" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 'dataMax + 1']}
              allowDecimals={false}
            />
            <YAxis 
              type="category" 
              dataKey="instalacion_nombre" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
              width={200}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', textAnchor: 'end' }}
              interval={0}
              tickFormatter={(value) => {
                if (value.length > 30) {
                  return value.substring(0, 27) + '...'
                }
                return value
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: any, name: string) => [
                `${value} PPC${value !== 1 ? 's' : ''}`,
                'Cantidad'
              ]}
              labelFormatter={(label: string) => `${label}`}
            />
            <Bar 
              dataKey="ppc_count" 
              radius={[0, 4, 4, 0]}
              maxBarSize={40}
              minPointSize={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 flex flex-wrap gap-3">
        {chartData.map((item, index) => (
          <div key={item.instalacion_nombre} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-4 h-4 rounded-sm" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-muted-foreground font-medium">
              {item.instalacion_nombre}: <span className="text-foreground font-semibold">{item.ppc_count} PPC</span>
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function DashboardSummary({ className }: DashboardSummaryProps) {
  const [resumen, setResumen] = React.useState<ResumenOperacional | null>(null)
  const [topPpc, setTopPpc] = React.useState<TopPpcData[]>([
    { instalacion_nombre: 'Plaza Los Leones', ppc_count: 8 },
    { instalacion_nombre: 'Centro Comercial Maipú', ppc_count: 6 },
    { instalacion_nombre: 'Oficinas Santiago Centro', ppc_count: 4 },
    { instalacion_nombre: 'Clínica Las Condes', ppc_count: 3 },
    { instalacion_nombre: 'Universidad de Chile', ppc_count: 2 }
  ])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard-metrics')
        const data = await response.json()
        
        if (data.success || data.metrics) {
          setResumen(data.metrics.resumenOperacional)
          // Ensure topPpcPorInstalacion is an array and has proper data format
          const topPpcData = data.metrics.topPpcPorInstalacion || []
          setTopPpc(Array.isArray(topPpcData) ? topPpcData : [])
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
          { instalacion_nombre: 'Plaza Los Leones', ppc_count: 8 },
          { instalacion_nombre: 'Centro Comercial Maipú', ppc_count: 6 },
          { instalacion_nombre: 'Oficinas Santiago Centro', ppc_count: 4 },
          { instalacion_nombre: 'Clínica Las Condes', ppc_count: 3 },
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