"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Home, 
  Users, 
  Building, 
  Shield,
  CalendarDays,
  AlertCircle,
  Repeat,
  FileText,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  MapPin,
  ClipboardList,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { DatabaseStatus } from "@/components/database-status"

const navigationItems = [
  {
    title: "Inicio",
    href: "/",
    icon: Home
  },
  {
    title: "Clientes",
    href: "/clientes",
    icon: Users
  },
  {
    title: "Instalaciones",
    href: "/instalaciones",
    icon: Building
  },
  {
    title: "Guardias",
    href: "/guardias",
    icon: Shield
  },
  {
    title: "Turnos diarios",
    href: "/turnos-diarios",
    icon: CalendarDays
  },
  {
    title: "PPC",
    href: "/ppc",
    icon: AlertCircle
  },
  {
    title: "Coberturas",
    href: "/coberturas",
    icon: Repeat
  },
  {
    title: "Documentos",
    href: "/documentos",
    icon: FileText
  },
  {
    title: "Alertas y KPIs",
    href: "/alertas-kpis",
    icon: Activity
  }
]

const configurationItems = [
  {
    title: "Asignaciones",
    href: "/configuracion/asignaciones",
    icon: LinkIcon
  },
  {
    title: "Puestos operativos",
    href: "/configuracion/puestos-operativos",
    icon: MapPin
  },
  {
    title: "Roles de servicio",
    href: "/configuracion/roles-servicio",
    icon: Clock
  },
  {
    title: "Pautas operativas",
    href: "/configuracion/pautas-operativas",
    icon: ClipboardList
  }
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isConfigurationOpen, setIsConfigurationOpen] = React.useState(
    pathname.startsWith('/configuracion')
  )

  // Mensaje de consola al cargar el componente
  React.useEffect(() => {
    console.log("Sidebar actualizado con roles de servicio y renombrado de pauta")
  }, [])

  // Auto-abrir configuración si estamos en una subpágina
  React.useEffect(() => {
    if (pathname.startsWith('/configuracion')) {
      setIsConfigurationOpen(true)
    }
  }, [pathname])

  const isConfigurationActive = pathname.startsWith('/configuracion')

  return (
    <motion.div
      className={cn(
        "flex flex-col h-full bg-card border-r border-border shadow-xl",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header del Sidebar */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <motion.h2
            className="text-lg font-semibold capitalize-first"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Operaciones
          </motion.h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2 p-4">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  "flex items-center px-3 py-2 rounded-lg transition-colors relative",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-primary text-primary-foreground",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && (
                  <motion.span
                    className="font-medium capitalize-first"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {item.title}
                  </motion.span>
                )}
                
                {/* Indicador activo */}
                {isActive && (
                  <motion.div
                    className="absolute right-0 top-1/2 w-1 h-6 bg-primary-foreground rounded-l-full"
                    layoutId="activeIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          )
        })}

        {/* Configuración Dropdown */}
        <div className="space-y-1">
          <motion.div
            className={cn(
              "flex items-center px-3 py-2 rounded-lg transition-colors relative cursor-pointer",
              "hover:bg-accent hover:text-accent-foreground",
              isConfigurationActive && "bg-primary text-primary-foreground",
              isCollapsed ? "justify-center" : "justify-between"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => !isCollapsed && setIsConfigurationOpen(!isConfigurationOpen)}
          >
            <div className="flex items-center">
              <Settings className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <motion.span
                  className="font-medium capitalize-first"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Configuración
                </motion.span>
              )}
            </div>
            
            {!isCollapsed && (
              <motion.div
                animate={{ rotate: isConfigurationOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            )}

            {/* Indicador activo */}
            {isConfigurationActive && (
              <motion.div
                className="absolute right-0 top-1/2 w-1 h-6 bg-primary-foreground rounded-l-full"
                layoutId="activeIndicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.div>

          {/* Subitems de Configuración */}
          <AnimatePresence>
            {isConfigurationOpen && !isCollapsed && (
              <motion.div
                className="ml-4 space-y-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {configurationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        className={cn(
                          "flex items-center px-3 py-2 rounded-lg transition-colors relative text-sm",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-primary text-primary-foreground"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        <span className="font-medium capitalize-first">
                          {item.title}
                        </span>
                        
                        {/* Indicador activo */}
                        {isActive && (
                          <motion.div
                            className="absolute right-0 top-1/2 w-1 h-6 bg-primary-foreground rounded-l-full"
                            layoutId="activeIndicator"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </motion.div>
                    </Link>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Estado de la Base de Datos */}
      <div className="border-t border-border p-4">
        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DatabaseStatus />
          </motion.div>
        ) : (
          <div className="flex justify-center">
            <DatabaseStatus compact />
          </div>
        )}
      </div>

      {/* Toggle de Tema en la parte inferior */}
      <div className="border-t border-border p-4">
        {!isCollapsed ? (
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-sm font-medium capitalize-first text-muted-foreground">
              Tema
            </span>
            <ThemeToggle />
          </motion.div>
        ) : (
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        )}
      </div>
    </motion.div>
  )
} 