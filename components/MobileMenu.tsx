"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Menu, 
  X,
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
  ChevronDown,
  Link as LinkIcon,
  MapPin,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GardLogo } from "@/components/GardLogo"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

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
    title: "Configuración General",
    href: "/configuracion",
    icon: Settings
  },
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
  }
]

interface MobileMenuProps {
  className?: string
}

export function MobileMenu({ className }: MobileMenuProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isConfigurationOpen, setIsConfigurationOpen] = React.useState(false)

  // Console.log al cargar el menú móvil
  React.useEffect(() => {
    console.log("Menú móvil cargado")
  }, [])

  // Efecto para abrir el drawer con console.log
  React.useEffect(() => {
    if (isOpen) {
      console.log("Menú móvil cargado")
    }
  }, [isOpen])

  // Cerrar menú al navegar
  React.useEffect(() => {
    setIsOpen(false)
    setIsConfigurationOpen(false)
  }, [pathname])

  const isConfigurationActive = pathname.startsWith('/configuracion')

  return (
    <div className={cn("md:hidden", className)}>
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DrawerTrigger>
        
        <DrawerContent side="left" className="h-full w-80 rounded-none border-r p-0">
          <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-black text-white">
            {/* Header del menú móvil */}
            <DrawerHeader className="flex items-center justify-between p-4 border-b border-gray-700">
              <DrawerTitle asChild>
                <GardLogo size="sm" showText={true} className="text-white" />
              </DrawerTitle>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-gray-800"
                  aria-label="Cerrar menú de navegación"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </DrawerHeader>

            <DrawerDescription className="sr-only">
              Menú de navegación principal de la aplicación
            </DrawerDescription>

            {/* Navegación principal */}
            <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                {navigationItems.map((item, index) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link href={item.href}>
                        <motion.div
                          className={cn(
                            "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
                            "text-white/80 hover:text-white hover:bg-white/10",
                            isActive && "bg-blue-600 text-white shadow-lg"
                          )}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Icon className="h-5 w-5 mr-3" />
                          <span className="font-medium">{item.title}</span>
                          
                          {/* Indicador activo */}
                          {isActive && (
                            <motion.div
                              className="ml-auto w-2 h-2 bg-white rounded-full"
                              layoutId="mobileActiveIndicator"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                        </motion.div>
                      </Link>
                    </motion.div>
                  )
                })}

                {/* Sección de Configuración */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: navigationItems.length * 0.05 }}
                  className="pt-4 border-t border-gray-700"
                >
                  <motion.div
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer",
                      "text-white/80 hover:text-white hover:bg-white/10",
                      isConfigurationActive && "bg-blue-600 text-white shadow-lg"
                    )}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsConfigurationOpen(!isConfigurationOpen)}
                  >
                    <div className="flex items-center">
                      <Settings className="h-5 w-5 mr-3" />
                      <span className="font-medium">Configuración</span>
                    </div>
                    
                    <motion.div
                      animate={{ rotate: isConfigurationOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>

                    {/* Indicador activo */}
                    {isConfigurationActive && (
                      <motion.div
                        className="absolute right-4 w-2 h-2 bg-white rounded-full"
                        layoutId="mobileActiveIndicator"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.div>

                  {/* Subitems de Configuración */}
                  <AnimatePresence>
                    {isConfigurationOpen && (
                      <motion.div
                        className="ml-6 mt-2 space-y-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        {configurationItems.map((item, index) => {
                          const Icon = item.icon
                          const isActive = pathname === item.href
                          
                          return (
                            <motion.div
                              key={item.href}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                              <Link href={item.href}>
                                <motion.div
                                  className={cn(
                                    "flex items-center px-4 py-2 rounded-lg transition-all duration-200 text-sm",
                                    "text-white/70 hover:text-white hover:bg-white/10",
                                    isActive && "bg-blue-600 text-white shadow-lg"
                                  )}
                                  whileHover={{ scale: 1.02, x: 4 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Icon className="h-4 w-4 mr-3" />
                                  <span className="font-medium">{item.title}</span>
                                  
                                  {/* Indicador activo */}
                                  {isActive && (
                                    <motion.div
                                      className="ml-auto w-2 h-2 bg-white rounded-full"
                                      layoutId="mobileActiveIndicator"
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                  )}
                                </motion.div>
                              </Link>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </nav>

            {/* Footer del menú */}
            <motion.div
              className="border-t border-gray-700 p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-center justify-center text-white/60 text-sm">
                <span>Sistema Operacional</span>
              </div>
            </motion.div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
} 