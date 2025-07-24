"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function PautasServicioPage() {
  return (
    <DatabaseTableViewer 
      tableName="pautas_operativas"
      title="Pautas Operativas"
      description="Configuración de pautas y protocolos operativos"
      initialLimit={10}
    />
  )
} 