"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function InstalacionesPage() {
  return (
    <DatabaseTableViewer 
      tableName="instalaciones"
      title="Instalaciones"
      description="Gestión de instalaciones y ubicaciones"
      initialLimit={10}
    />
  )
} 