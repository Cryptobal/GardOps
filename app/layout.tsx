import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { MobileMenu } from "@/components/MobileMenu"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GARD Security - Sistema Operacional",
  description: "Sistema de gestión operativa y seguridad profesional - GARD Security",
  icons: {
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDJMMiA5djE0YzAgNS41IDMuNSAxMCA4IDExdi04YzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDR2OGM0LjUtMSA4LTUuNSA4LTExVjlMMTYgMnoiIGZpbGw9IiM2MzY2ZjEiLz4KPHJlY3QgeD0iMTQiIHk9IjE2IiB3aWR0aD0iNCIgaGVpZ2h0PSIxMiIgcng9IjEiIGZpbGw9IiMzNzMwYTMiLz4KPC9zdmc+",
    shortcut: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDJMMiA5djE0YzAgNS41IDMuNSAxMCA4IDExdi04YzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDR2OGM0LjUtMSA4LTUuNSA4LTExVjlMMTYgMnoiIGZpbGw9IiM2MzY2ZjEiLz4KPHJlY3QgeD0iMTQiIHk9IjE2IiB3aWR0aD0iNCIgaGVpZ2h0PSIxMiIgcng9IjEiIGZpbGw9IiMzNzMwYTMiLz4KPC9zdmc+",
  },
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
              {/* Sidebar lateral izquierda - oculto en móviles */}
              <aside className="hidden md:flex">
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