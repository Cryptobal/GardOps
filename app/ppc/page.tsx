"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function PPCPage() {
  return (
    <DatabaseTableViewer 
      tableName="ppc"
      title="PPC"
      description="Gestión de Procedimientos de Protección Civil"
      initialLimit={10}
    />
  )
} 