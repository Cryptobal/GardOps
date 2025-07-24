"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function CoberturasPage() {
  return (
    <DatabaseTableViewer 
      tableName="coberturas"
      title="Coberturas"
      description="Gestión de coberturas de servicio"
      initialLimit={10}
    />
  )
} 