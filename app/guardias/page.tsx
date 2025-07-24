"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function GuardiasPage() {
  return (
    <DatabaseTableViewer 
      tableName="guardias"
      title="Guardias"
      description="Gestión de guardias de seguridad"
      initialLimit={10}
    />
  )
} 