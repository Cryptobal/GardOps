"use client"

import { DatabaseTableViewer } from "@/components/database-table-viewer"

export default function ClientesPage() {
  return (
    <DatabaseTableViewer 
      tableName="clientes"
      title="Clientes"
      description="Gestión de clientes y contactos"
      initialLimit={15}
    />
  )
} 