import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '../components/layout/sidebar'
import { Navbar } from '../components/layout/navbar'

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
      <body className={inter.className}>
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
        </div>
        
        {/* Mobile sidebar */}
        <Sidebar className="lg:hidden" />
      </body>
    </html>
  )
} 