"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { InstalacionesMap } from "@/components/instalaciones-map"

export default function HomePage() {
  // Mostrar mensaje en consola al cargar la página
  React.useEffect(() => {
    console.log("Layout base cargado exitosamente")
  }, [])

  return (
    <div className="space-y-8">
      {/* Header de bienvenida */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold capitalize-first">
          Bienvenido a App Operaciones
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Sistema de gestión operativa profesional con diseño moderno y responsive
        </p>
      </motion.div>

      {/* Cards de estadísticas */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {[
          { title: "Clientes", count: "1,234", color: "text-blue-600" },
          { title: "Instalaciones", count: "567", color: "text-green-600" },
          { title: "Proyectos activos", count: "89", color: "text-yellow-600" },
          { title: "Técnicos", count: "45", color: "text-purple-600" },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            className="p-6 rounded-2xl border bg-card shadow-lg hover:shadow-xl transition-shadow"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            whileHover={{ scale: 1.05 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground capitalize-first">
              {stat.title}
            </h3>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>
              {stat.count}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Mapa de instalaciones */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-2xl font-semibold capitalize-first">
          Mapa de instalaciones
        </h2>
        <p className="text-muted-foreground">
          Ubicación de todas las instalaciones con coordenadas registradas
        </p>
        <InstalacionesMap height="400px" />
      </motion.div>

      {/* Sección de características */}
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h2 className="text-2xl font-semibold capitalize-first">
          Características principales
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Tema oscuro por defecto",
              description: "Diseño moderno con soporte para modo claro y oscuro"
            },
            {
              title: "Navegación intuitiva",
              description: "Sidebar colapsable con animaciones suaves"
            },
            {
              title: "Diseño responsive",
              description: "Adaptado para todos los dispositivos"
            },
            {
              title: "Componentes modernos",
              description: "Construido con shadcn/ui y TailwindCSS"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="p-6 rounded-2xl border bg-card/50"
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <h3 className="font-semibold mb-2 capitalize-first">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
} 