export default function AsignacionesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold capitalize-first">Asignaciones</h1>
          <p className="text-muted-foreground">Configuración → Asignaciones</p>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-2xl shadow-xl border bg-background p-6">
          <h2 className="text-xl font-semibold mb-4 capitalize-first">
            Gestión de asignaciones
          </h2>
          <p className="text-muted-foreground">
            Configuración de asignaciones de personal y recursos operativos.
          </p>
        </div>
      </div>
    </div>
  )
} 