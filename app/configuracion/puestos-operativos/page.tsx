export default function PuestosOperativosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold capitalize-first">Puestos operativos</h1>
          <p className="text-muted-foreground">Configuración → Puestos operativos</p>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-2xl shadow-xl border bg-background p-6">
          <h2 className="text-xl font-semibold mb-4 capitalize-first">
            Configuración de puestos
          </h2>
          <p className="text-muted-foreground">
            Definición y gestión de puestos operativos del sistema.
          </p>
        </div>
      </div>
    </div>
  )
} 