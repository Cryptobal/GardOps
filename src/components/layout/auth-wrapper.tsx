'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isAuthenticated } from '../../lib/auth'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      
      if (!authenticated && !isPublicRoute) {
        router.push('/login')
      } else if (authenticated && pathname === '/login') {
        router.push('/')
      }
      
      setIsLoading(false)
    }

    checkAuth()
  }, [pathname, isPublicRoute, router])

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-foreground">Cargando...</span>
        </div>
      </div>
    )
  }

  // Si es ruta pública, mostrar solo el children
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Si no está autenticado en ruta privada, no mostrar nada (se redirige)
  if (!isAuth) {
    return null
  }

  // Para rutas privadas, mostrar el layout completo
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar className="hidden lg:flex lg:w-80 lg:flex-col" />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile sidebar */}
      <Sidebar className="lg:hidden" />
    </div>
  )
} 