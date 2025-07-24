import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "App Operaciones",
  description: "Sistema de gestión operativa profesional",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mostrar mensaje en consola al cargar el layout
  if (typeof window !== 'undefined') {
    console.log("Layout base cargado exitosamente")
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <div className="relative min-h-screen bg-background">
            {/* Navbar superior fijo */}
            <Navbar />
            
            <div className="flex">
              {/* Sidebar lateral izquierda */}
              <aside className="hidden md:block">
                <div className="sticky top-16 h-[calc(100vh-4rem)]">
                  <Sidebar />
                </div>
              </aside>

              {/* Contenido principal */}
              <main className="flex-1 min-h-[calc(100vh-4rem)]">
                <div className="max-w-7xl mx-auto px-6 py-8">
                  <div className="rounded-2xl shadow-xl border bg-background p-6">
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
} 