"use client"

import { useState, useEffect } from 'react'
import { DatabaseTableViewer } from "@/components/database-table-viewer"
import { GuardiaForm } from "@/components/GuardiaForm"
import { Button } from "@/components/ui/button"
import { Plus, Users, Shield } from "lucide-react"
import { motion } from "framer-motion"

export default function GuardiasPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isMobileView, setIsMobileView] = useState(false)

  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleNewGuardia = () => {
    setEditData(null)
    setIsFormOpen(true)
  }

  const handleEditGuardia = (guardia: any) => {
    setEditData(guardia)
    setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header optimizado para móvil */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                {isMobileView && <Users className="h-5 w-5 text-muted-foreground" />}
              </div>
              Guardias
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {isMobileView 
                ? "Gestión de guardias de seguridad" 
                : "Gestión de guardias de seguridad con georreferenciación"
              }
            </p>
          </div>
          
          {/* Botón optimizado para móvil */}
          <Button 
            onClick={handleNewGuardia} 
            className={`gap-2 ${isMobileView ? 'w-full sm:w-auto' : ''}`}
            size={isMobileView ? "lg" : "default"}
          >
            <Plus className="h-4 w-4" />
            {isMobileView ? "Agregar Nuevo Guardia" : "Nuevo Guardia"}
          </Button>
        </div>


      </motion.div>

      {/* Contenedor de tabla con padding responsivo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={isMobileView ? "px-0" : ""}
      >
        <DatabaseTableViewer 
          key={refreshKey}
          tableName="guardias"
          title={isMobileView ? "Guardias" : "Lista de Guardias"}
          description={isMobileView ? "Gestión completa" : "Gestión completa de guardias de seguridad"}
          initialLimit={isMobileView ? 5 : 10}
          onEdit={handleEditGuardia}
        />
      </motion.div>

      {/* Formulario optimizado para móvil */}
      <GuardiaForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editData={editData}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
} 