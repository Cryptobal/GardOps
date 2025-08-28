import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthWrapper } from '../components/layout/auth-wrapper'
import { ToastContainer } from '../components/ui/toast'
import { ErrorBoundary } from '../components/debug-error-boundary'
import { PermissionsProvider } from '../lib/permissions-context'
import { PermissionsLoading } from '../components/layout/permissions-loading'
import { NotificationProvider } from '../contexts/NotificationContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GardOps - Sistema de Gestión de Guardias',
  description: 'Sistema profesional para la gestión de guardias de seguridad, instalaciones y clientes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
          async
          defer
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <NotificationProvider>
            <PermissionsProvider>
              <AuthWrapper>
                {children}
              </AuthWrapper>
            </PermissionsProvider>
            <ToastContainer />
          </NotificationProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
} 