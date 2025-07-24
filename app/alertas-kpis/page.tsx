"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function AlertasKPIsPage() {
  return (
    <DatabaseTableViewer 
      tableName="alertas_kpis"
      title="Alertas y KPIs"
      description="Monitoreo de alertas y indicadores clave de rendimiento"
      initialLimit={15}
    />
  )
} 