"use client";

import { usePathname } from "next/navigation";
import { navigationItems } from "../../lib/navigation";
import { logout, getToken } from "../../lib/auth";
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
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileMenuToggle}
          className="lg:hidden mr-2 px-2 py-1 h-8 w-8 rounded-lg bg-accent/50 border border-border/30 hover:bg-accent/70 ml-4"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Page title and description */}
        <div className="flex flex-col ml-4">
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
          {pageDescription && (
            <p className="text-sm text-muted-foreground">{pageDescription}</p>
          )}
        </div>

        {/* Right side - User info and actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 rounded-lg"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* User info */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 border border-border/30">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{getUserDisplayName()}</span>
          </div>

          {/* Logout button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 px-3 rounded-lg hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Cerrar</span>
          </Button>
        </div>
      </div>
    </nav>
  );
} 