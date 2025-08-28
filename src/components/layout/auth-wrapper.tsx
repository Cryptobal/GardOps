'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isAuthenticated, setupAutoTokenRefresh } from '../../lib/auth-client'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import { cn } from '../../lib/utils'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/login',
    '/recuperar-contrasena',
    '/restablecer-contrasena',
    '/test-page'
  ]
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    const checkAuth = () => {
      const auth = isAuthenticated()
      setIsAuth(auth)
      setIsLoading(false)

      if (auth) {
        // Configurar renovación automática del token solo si está autenticado
        setupAutoTokenRefresh()
      }

      if (!auth && !isPublicRoute) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [pathname, isPublicRoute, router])

  // Cerrar menú móvil al cambiar de página
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  }

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (isPublicRoute) {
    return <>{children}</>
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onCollapseChange={handleSidebarCollapse}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={handleMobileMenuClose}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Navbar */}
          <Navbar onMobileMenuToggle={handleMobileMenuToggle} />

          {/* Page content */}
          <main className={cn(
            "flex-1 overflow-auto transition-all duration-500 ease-in-out",
            isSidebarCollapsed ? "lg:ml-5" : "lg:ml-0"
          )}>
            <div className="container mx-auto p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
} 