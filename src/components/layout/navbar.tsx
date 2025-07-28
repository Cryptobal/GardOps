"use client";

import { usePathname } from "next/navigation";
import { navigationItems } from "../../lib/navigation";
import { logout, getToken } from "../../lib/auth";
import { Button } from "../ui/button";
import { LogOut, User } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  
  const currentPage = navigationItems.find(item => item.href === pathname);
  const pageTitle = currentPage?.name || "GardOps";
  const pageDescription = currentPage?.description || "Sistema de Gestión de Guardias";

  const handleLogout = () => {
    logout();
  };

  // Obtener email del usuario desde el token
  const getUserEmail = () => {
    const token = getToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email;
    } catch {
      return null;
    }
  };

  const userEmail = getUserEmail();

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
        
        <div className="flex items-center gap-4">
          {/* Fecha y hora */}
          <div className="hidden md:block text-right">
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

          {/* Usuario y logout */}
          <div className="flex items-center gap-3 px-3 py-2 bg-background/50 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium hidden sm:block">
                {userEmail || 'Usuario'}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="p-2 hover:bg-destructive/10 hover:text-destructive"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 