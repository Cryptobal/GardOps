export default function PPCPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">PPC</h1>
        <span className="text-sm text-muted-foreground capitalize-first">
          Puestos por cubrir
        </span>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-2xl shadow-xl border bg-background p-6">
          <h2 className="text-xl font-semibold mb-4 capitalize-first">
            Puestos pendientes
          </h2>
          <p className="text-muted-foreground">
            Gestión de puestos operativos que requieren cobertura.
          </p>
        </div>
      </div>
    </div>
  )
} 