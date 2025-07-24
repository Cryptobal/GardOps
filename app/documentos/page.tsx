export default function DocumentosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold capitalize-first">Documentos</h1>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-2xl shadow-xl border bg-background p-6">
          <h2 className="text-xl font-semibold mb-4 capitalize-first">
            Gestión documental
          </h2>
          <p className="text-muted-foreground">
            Administración de documentos y archivos operativos.
          </p>
        </div>
      </div>
    </div>
  )
} 