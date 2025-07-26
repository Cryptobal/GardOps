"use client"

import { useState } from 'react'
import { DatabaseTableViewer } from "@/components/database-table-viewer"
import { GuardiaForm } from "@/components/GuardiaForm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function GuardiasPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guardias</h1>
          <p className="text-muted-foreground">
            Gestión de guardias de seguridad con georreferenciación
          </p>
        </div>
        <Button onClick={handleNewGuardia} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Guardia
        </Button>
      </div>

      <DatabaseTableViewer 
        key={refreshKey}
        tableName="guardias"
        title="Lista de Guardias"
        description="Gestión completa de guardias de seguridad"
        initialLimit={10}
        onEdit={handleEditGuardia}
      />

      <GuardiaForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editData={editData}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
} 