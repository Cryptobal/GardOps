"use client";

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Página no encontrada</h2>
        <p className="text-gray-600 max-w-md">
          La página que buscas no existe o ha sido movida.
        </p>
        <div className="space-x-4">
          <Button asChild variant="default">
            <Link href="/">
              Ir al inicio
            </Link>
          </Button>
          <Button onClick={() => window.history.back()} variant="outline">
            Volver atrás
          </Button>
        </div>
      </div>
    </div>
  )
} 