"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function TurnosDiariosPage() {
  return (
    <DatabaseTableViewer 
      tableName="turnos_diarios"
      title="Turnos Diarios"
      description="Gestión de turnos y horarios diarios"
      initialLimit={20}
    />
  )
} 