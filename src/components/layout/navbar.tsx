"use client";

import { usePathname } from "next/navigation";
import { navigationItems } from "../../lib/navigation";
import { logout, getToken } from "../../lib/auth-client";
import { Button } from "../ui/button";
import { LogOut, User, Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

export function Navbar({ onMobileMenuToggle }: NavbarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  
  const currentPage = navigationItems.find(item => item.href === pathname);
  const pageTitle = currentPage?.name || "GardOps";
  const pageDescription = currentPage?.description;

  const handleLogout = () => {
    logout();
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light");
  };

  // Obtener información del usuario desde el token JWT
  const getUserDisplayName = () => {
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.name || payload.email || "Usuario";
      }
    } catch (error) {
      console.error("Error parsing token:", error);
    }
    return "Usuario";
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 sm:h-14 md:h-16 max-w-screen-2xl items-center px-2 sm:px-4 md:px-6">
        {/* Mobile menu button - Ultra Responsive */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileMenuToggle}
          className="lg:hidden mr-1 sm:mr-2 px-1.5 sm:px-2 py-1 h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-accent/50 border border-border/30 hover:bg-accent/70 ml-1 sm:ml-2 md:ml-4 touch-manipulation active:scale-95 transition-transform"
        >
          <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>

        {/* Page title and description - Responsive */}
        <div className="flex flex-col ml-2 sm:ml-3 md:ml-4 flex-1 min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate">{pageTitle}</h1>
          {pageDescription && (
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate hidden sm:block">
              {pageDescription}
            </p>
          )}
        </div>

        {/* Right side - User info and actions - Ultra Responsive */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Theme toggle button - Responsive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg touch-manipulation active:scale-95 transition-transform"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </Button>

          {/* User info - Responsive (hidden on very small screens) */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-accent/50 border border-border/30">
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-foreground max-w-[80px] sm:max-w-[120px] md:max-w-none truncate">
              {getUserDisplayName()}
            </span>
          </div>

          {/* Logout button - Responsive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg hover:bg-destructive/10 hover:text-destructive touch-manipulation active:scale-95 transition-transform"
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
            <span className="hidden md:inline text-xs sm:text-sm">Cerrar</span>
          </Button>
        </div>
      </div>
    </nav>
  );
} 