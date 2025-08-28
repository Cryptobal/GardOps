'use client';

import React, { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'
import Link from 'next/link'

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/recuperar-contrasena', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.')
      } else {
        setError(data.error || 'Error al procesar la solicitud')
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Recuperar Contraseña</h1>
          <p className="text-muted-foreground">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Correo electrónico
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              required
              className="w-full"
              autoComplete="email"
            />
          </div>

          {message && (
            <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md border border-green-200">
              {message}
            </div>
          )}

          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link 
            href="/login" 
            className="text-sm text-primary hover:underline"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </Card>
    </div>
  )
}
