"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold capitalize-first">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Ajustes de la aplicación y preferencias
        </p>
      </motion.div>

      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-4 capitalize-first">
            Apariencia
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize-first">Tema de la aplicación</p>
              <p className="text-sm text-muted-foreground">
                Alternar entre modo claro y oscuro
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-4 capitalize-first">
            Configuración general
          </h2>
          <p className="text-muted-foreground">
            Aquí se implementarán más opciones de configuración
          </p>
        </div>
      </motion.div>
    </div>
  )
} 