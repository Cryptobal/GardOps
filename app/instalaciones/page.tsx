"use client"

import * as React from "react"
import { motion } from "framer-motion"

export default function InstalacionesPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold capitalize-first">Instalaciones</h1>
        <p className="text-muted-foreground mt-2">
          Control y seguimiento de instalaciones
        </p>
      </motion.div>

      <motion.div
        className="p-8 rounded-2xl border bg-card text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4 capitalize-first">
          Módulo de instalaciones
        </h2>
        <p className="text-muted-foreground">
          Aquí se implementará la gestión completa de instalaciones
        </p>
      </motion.div>
    </div>
  )
} 