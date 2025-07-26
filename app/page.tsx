"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { DashboardKpis } from "@/components/dashboard-kpis"
import { DashboardSummary } from "@/components/dashboard-summary"
import { EnhancedInstalacionesMap } from "@/components/enhanced-instalaciones-map"
import { Activity, Command } from "lucide-react"

export default function HomePage() {
  const [currentTime, setCurrentTime] = React.useState<string>('')
  
  // Establecer tiempo inicial solo en el cliente para evitar errores de hidratación
  React.useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString('es-CL'))
  }, [])

  return (
    <div className="space-y-8">
      {/* Command Center Header */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center space-x-3">
          <div className="rounded-lg p-2 bg-blue-500/10">
            <Command className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Command Center Operacional
          </h1>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          <p className="text-lg text-muted-foreground">
            Sistema de monitoreo y control en tiempo real
          </p>
        </div>
      </motion.div>

      {/* KPIs Operacionales */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <DashboardKpis />
      </motion.section>

      {/* Mapa de Instalaciones Mejorado */}
      <motion.section
        className="space-y-4"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Mapa Operacional de Instalaciones
            </h2>
            <p className="text-muted-foreground">
              Vista geográfica con estados operativos en tiempo real
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Actualización automática</span>
          </div>
        </div>
        <EnhancedInstalacionesMap height="500px" />
      </motion.section>

      {/* Resumen Operacional */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <DashboardSummary />
      </motion.section>

      {/* Footer del Command Center */}
      <motion.footer
        className="text-center py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
                 <div className="space-y-2">
           <p className="text-xs text-muted-foreground/70">
             Última actualización: {currentTime || '--:--:--'}
           </p>
          <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground/60">
            <span>🔄 Auto-refresh: 30s</span>
            <span>📡 Estado: Conectado</span>
            <span>🎯 Operaciones: Activas</span>
          </div>
        </div>
      </motion.footer>
    </div>
  )
} 