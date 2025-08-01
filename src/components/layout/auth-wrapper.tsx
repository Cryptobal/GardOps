'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isAuthenticated } from '../../lib/auth'
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
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    const checkAuth = () => {
      console.log('🔍 AuthWrapper: Verificando autenticación...')
      console.log('🔍 AuthWrapper: Ruta actual:', pathname)
      console.log('🔍 AuthWrapper: Es ruta pública:', isPublicRoute)
      
      const auth = isAuthenticated()
      console.log('🔍 AuthWrapper: Usuario autenticado:', auth)
      
      setIsAuth(auth)
      setIsLoading(false)

      if (!auth && !isPublicRoute) {
        console.log('🔍 AuthWrapper: Redirigiendo a login...')
        router.push('/login')
      }
    }

    checkAuth()
  }, [pathname, router, isPublicRoute])

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

  console.log('🔍 AuthWrapper: Renderizando...', { isLoading, isAuth, isPublicRoute })

  if (isLoading) {
    console.log('🔍 AuthWrapper: Mostrando spinner de carga...')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isPublicRoute) {
    console.log('🔍 AuthWrapper: Ruta pública, mostrando contenido sin layout...')
    return <>{children}</>
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