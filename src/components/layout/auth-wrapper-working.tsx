'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isAuthenticated } from '../../lib/auth-client'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import { cn } from '../../lib/utils'
import React, { useCallback, useMemo } from 'react'

interface AuthWrapperProps {
  children: React.ReactNode
}

export const AuthWrapperWorking = React.memo(function AuthWrapperWorking({ children }: AuthWrapperProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/recuperar-contrasena', '/restablecer-contrasena']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/restablecer-contrasena')

  // Bypass de desarrollo: permitir acceso sin autenticación
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  useEffect(() => {
    if (isDev) {
      // En desarrollo, permitir acceso inmediatamente
      setIsAuth(true)
      setIsLoading(false)
      return
    }

    // En producción, verificar autenticación
    const auth = isAuthenticated()
    setIsAuth(auth)
    setIsLoading(false)

    if (!auth && !isPublicRoute) {
      router.push('/login')
    }
  }, [pathname, isPublicRoute, router, isDev])

  // Cerrar menú móvil al cambiar de página
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const handleCollapseChange = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed)
  }, [])

  const handleMobileClose = useCallback(() => {
    setIsMobileOpen(false)
  }, [])

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileOpen(prev => !prev)
  }, [])

  // Memoizar el contenido principal para evitar re-renderizados
  const mainContent = useMemo(() => (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Navbar */}
      <Navbar onMobileMenuToggle={handleMobileMenuToggle} />

      {/* Page content */}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-500 ease-in-out",
        isCollapsed ? "lg:ml-5" : "lg:ml-0"
      )}>
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  ), [children, handleMobileMenuToggle, isCollapsed])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          isCollapsed={isCollapsed}
          onCollapseChange={handleCollapseChange}
          isMobileOpen={isMobileOpen}
          onMobileClose={handleMobileClose}
        />

        {/* Main content */}
        {mainContent}
      </div>
    </div>
  )
})
