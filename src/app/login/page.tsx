'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '../../lib/api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'
import { PasswordInput } from '../../components/ui/password-input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      console.log("🔄 Iniciando proceso de login...")
      await login(email, password)
      console.log("✅ Login exitoso - iniciando redirección...")
      
      // Intentar redirección forzada
      console.log("🔄 Intentando router.push('/')...")
      router.push('/')
      
      // Fallback: redirección manual después de un pequeño delay
      setTimeout(() => {
        console.log("🔄 Fallback: redirección manual...")
        window.location.href = '/'
      }, 1000)
      
    } catch (err) {
      console.error("❌ Error en login:", err)
      setError('Credenciales incorrectas. Intenta nuevamente.')
      setIsLoading(false)
    }
    // NO ponemos setIsLoading(false) aquí para que mantenga el loading durante la redirección
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">GardOps</h1>
          <p className="text-muted-foreground">Inicia sesión en tu cuenta</p>
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

          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            label="Contraseña"
          />

          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-md">
              {error}
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
                <span>Iniciando sesión...</span>
              </div>
            ) : (
              'Iniciar sesión'
            )}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <Link 
            href="/recuperar-contrasena" 
            className="text-sm text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <div className="text-sm text-muted-foreground">
            Sistema de gestión de guardias de seguridad
          </div>
        </div>
      </Card>
    </div>
  )
} 