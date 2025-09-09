'use client'

import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-600">Error Crítico</h2>
            <p className="text-gray-600 max-w-md">
              Ha ocurrido un error crítico en la aplicación. Por favor, recarga la página.
            </p>
            <div className="space-x-4">
              <Button onClick={reset} variant="default">
                Intentar de nuevo
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Recargar página
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
} 