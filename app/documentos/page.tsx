"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function DocumentosPage() {
  return (
    <DatabaseTableViewer 
      tableName="documentos"
      title="Documentos"
      description="Gestión de documentos y archivos"
      initialLimit={10}
    />
  )
} 