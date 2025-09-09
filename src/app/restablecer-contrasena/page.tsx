'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { PasswordInput } from '../../components/ui/password-input'

export default function RestablecerContrasenaPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación no encontrado')
      setIsValidating(false)
      return
    }

    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/verificar-token?token=${token}`)
      const data = await response.json()

      if (response.ok && data.valid) {
        setIsValidToken(true)
        setUser(data.user)
      } else {
        setError(data.error || 'Token inválido o expirado')
      }
    } catch (err) {
      console.error('Error al verificar token:', err)
      setError('Error al verificar el token. El enlace puede haber expirado.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (newPassword.length < 6) {
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
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setNewPassword('')
        setConfirmPassword('')
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(data.error || 'Error al restablecer la contraseña')
      }
    } catch (err) {
      console.error('Error al restablecer contraseña:', err)
      setError('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Verificando token...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">🔐 GardOps</h1>
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
            <Link 
              href="/recuperar-contrasena" 
              className="text-sm text-primary hover:underline"
            >
              Solicitar nuevo enlace de recuperación
            </Link>
            <div className="pt-4">
              <Link 
                href="/login" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">🔐 GardOps</h1>
          <p className="text-muted-foreground">Restablecer contraseña</p>
          {user && (
            <p className="text-sm text-muted-foreground">
              Para: {user.nombre} ({user.email})
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contraseña"
            required
            autoComplete="new-password"
            label="Nueva contraseña"
          />

          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar contraseña"
            required
            autoComplete="new-password"
            label="Confirmar contraseña"
          />

          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {message && (
            <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md border border-green-200">
              {message}
              <p className="mt-2 text-xs">Redirigiendo al inicio de sesión...</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Restableciendo...</span>
              </div>
            ) : (
              'Restablecer contraseña'
            )}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <Link 
            href="/login" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>La contraseña debe tener al menos 6 caracteres</p>
        </div>
      </Card>
    </div>
  )
}
