export default function AlertasKPIsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold capitalize-first">Alertas y KPIs</h1>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-2xl shadow-xl border bg-background p-6">
          <h2 className="text-xl font-semibold mb-4 capitalize-first">
            Monitoreo y métricas
          </h2>
          <p className="text-muted-foreground">
            Panel de alertas y indicadores clave de rendimiento.
          </p>
        </div>
      </div>
    </div>
  )
} 