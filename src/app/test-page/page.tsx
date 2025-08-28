'use client';

import React from 'react'
import { Card } from '../../components/ui/card'
import Link from 'next/link'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Página de Prueba</h1>
          <p className="text-muted-foreground">
            Esta es una página de prueba para verificar la navegación
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <Link 
              href="/login" 
              className="text-sm text-primary hover:underline"
            >
              ← Volver al login
            </Link>
          </div>
          
          <div className="text-center">
            <Link 
              href="/recuperar-contrasena" 
              className="text-sm text-primary hover:underline"
            >
              → Ir a recuperar contraseña
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
