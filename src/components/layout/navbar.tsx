"use client";

import { usePathname } from "next/navigation";
import { navigationItems } from "../../lib/navigation";

export function Navbar() {
  const pathname = usePathname();
  
  const currentPage = navigationItems.find(item => item.href === pathname);
  const pageTitle = currentPage?.name || "GardOps";
  const pageDescription = currentPage?.description || "Sistema de Gestión de Guardias";

  return (
    <header className="bg-card/95 backdrop-blur-xl border-b border-border/50 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 key={pageTitle} className="text-3xl font-bold heading-gradient animate-in fade-in slide-in-from-left-4 duration-500">
            {pageTitle}
          </h1>
          <p
            key={pageDescription}
            className="text-muted-foreground mt-1 animate-in fade-in slide-in-from-left-4 duration-500"
            style={{ animationDelay: '100ms' }}
          >
            {pageDescription}
          </p>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
} 