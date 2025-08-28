'use client';

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { PasswordInput } from '../../components/ui/password-input'
import { Card } from '../../components/ui/card'
import Link from 'next/link'

export default function RestablecerContrasenaPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isValidToken, setIsValidToken] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación no válido')
      setIsCheckingToken(false)
      return
    }

    // Verificar que el token sea válido
    const checkToken = async () => {
      try {
        const response = await fetch(`/api/auth/verificar-token?token=${token}`)
        if (response.ok) {
          setIsValidToken(true)
        } else {
          setError('El enlace de recuperación ha expirado o no es válido')
        }
      } catch (err) {
        setError('Error al verificar el token')
      } finally {
        setIsCheckingToken(false)
      }
    }

    checkToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/restablecer-contrasena', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Contraseña actualizada correctamente. Puedes iniciar sesión con tu nueva contraseña.')
      } else {
        setError(data.error || 'Error al restablecer la contraseña')
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Verificando enlace...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Enlace Inválido</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <div className="text-center">
            <Link 
              href="/recuperar-contrasena" 
              className="text-sm text-primary hover:underline"
            >
              Solicitar nuevo enlace de recuperación
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Restablecer Contraseña</h1>
          <p className="text-muted-foreground">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            label="Nueva contraseña"
          />

          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            label="Confirmar contraseña"
          />

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
                Actualizando...
              </>
            ) : (
              'Actualizar contraseña'
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
