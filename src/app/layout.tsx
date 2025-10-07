import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthWrapperWorking as AuthWrapper } from '../components/layout/auth-wrapper-working'
import { ToastContainer } from '../components/ui/toast'
import { ErrorBoundary } from '../components/debug-error-boundary'
import { FlagsProvider } from '../lib/flags.context'

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
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <FlagsProvider>
            <AuthWrapper>
              {children}
            </AuthWrapper>
            <ToastContainer />
          </FlagsProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
} 