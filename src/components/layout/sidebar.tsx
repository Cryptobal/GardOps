"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun, ChevronLeft, ChevronRight } from "lucide-react";
import { navigationItems } from "../../lib/navigation";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ 
  className, 
  isCollapsed: externalIsCollapsed, 
  onCollapseChange,
  isMobileOpen = false,
  onMobileClose
}: SidebarProps) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const pathname = usePathname();

  // Usar el estado externo si está disponible, sino usar el interno
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = onCollapseChange || setInternalIsCollapsed;

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light");
  };

  const toggleSidebar = () => {
    // This function is no longer needed as isMobileOpen is passed as a prop
    // setIsOpen(!isOpen); 
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar unificado */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[70] h-full bg-background border-r border-border/50 transition-all duration-500 ease-in-out",
          // Desktop: sidebar colapsable
          "lg:relative lg:z-auto",
          // Móvil: overlay con animación
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Ancho responsive
          isCollapsed ? "w-20" : "w-64",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold text-lg">G</span>
                </div>
                <div className={cn(
                  "overflow-hidden transition-all duration-500 ease-in-out",
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}>
                  <h2 className="text-xl font-bold text-foreground whitespace-nowrap">GardOps</h2>
                  <p className="text-sm text-muted-foreground whitespace-nowrap">Sistema de Gestión</p>
                </div>
              </div>
              
              {/* Botón X para cerrar en móvil */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onMobileClose}
                className="lg:hidden p-2 h-8 w-8 rounded-full bg-accent/50 border border-border/30 hover:bg-accent/70"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => onMobileClose?.()}
                    className={cn(
                      "sidebar-item",
                      isActive && "active",
                      isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate">{item.name}</span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-border/50">
            {!isCollapsed ? (
              <div className="space-y-4">
                {/* Collapse toggle button - solo visible en desktop */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="w-full hidden lg:flex items-center gap-2 text-foreground hover:text-primary hover:bg-accent/50 transition-colors duration-200 border border-border/30 hover:border-border/60 font-medium"
                >
                  <div className="w-4 h-4 border border-current rounded-sm flex items-center justify-center">
                    <ChevronLeft className="h-3 w-3" />
                  </div>
                  <span className="text-xs">Colapsar menú</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Expand toggle button - solo visible en desktop */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="w-full hidden lg:flex items-center justify-center text-foreground hover:text-primary hover:bg-accent/50 transition-colors duration-200 border border-border/30 hover:border-border/60"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
} 