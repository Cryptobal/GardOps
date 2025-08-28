'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error en estructuras-unificadas:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Error en Estructuras Unificadas</h2>
        <p className="text-gray-600 max-w-md">
          Ha ocurrido un error al cargar la página de estructuras unificadas.
        </p>
        <div className="space-x-4">
          <Button onClick={reset} variant="default">
            Intentar de nuevo
          </Button>
          <Button onClick={() => window.location.href = '/payroll'} variant="outline">
            Volver a Payroll
          </Button>
        </div>
      </div>
    </div>
  )
}
