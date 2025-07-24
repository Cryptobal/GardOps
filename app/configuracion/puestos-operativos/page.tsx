"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function PuestosOperativosPage() {
  return (
    <DatabaseTableViewer 
      tableName="puestos_operativos"
      title="Puestos Operativos"
      description="Configuración de puestos operativos"
      initialLimit={10}
    />
  )
} 