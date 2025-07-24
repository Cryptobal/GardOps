"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function PautasServicioPage() {
  return (
    <DatabaseTableViewer 
      tableName="pautas_servicio"
      title="Pautas de Servicio"
      description="Configuración de pautas y protocolos de servicio"
      initialLimit={10}
    />
  )
} 