"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function AsignacionesPage() {
  return (
    <DatabaseTableViewer 
      tableName="asignaciones"
      title="Asignaciones"
      description="Configuración de asignaciones de personal"
      initialLimit={10}
    />
  )
} 