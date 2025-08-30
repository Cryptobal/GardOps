"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { navigationItems } from "../../lib/navigation";
import { useFlag } from "@/lib/flags.context";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { NavigationItemWrapper } from "./navigation-item-wrapper";
import React from "react";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar = React.memo(function Sidebar({ 
  className, 
  isCollapsed: externalIsCollapsed, 
  onCollapseChange,
  isMobileOpen = false,
  onMobileClose
}: SidebarProps) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const adoV2On = useFlag('ado_v2');

  // Usar el estado externo si está disponible, sino usar el interno
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = onCollapseChange || setInternalIsCollapsed;

  const toggleTheme = useCallback(() => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light");
  }, [isDark]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed, setIsCollapsed]);

  const toggleExpanded = useCallback((itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  }, []);

  const isItemActive = useCallback((item: any) => {
    if (item.href === pathname) return true;
    if (item.children) {
      return item.children.some((child: any) => child.href === pathname);
    }
    return false;
  }, [pathname]);

  // Memoizar los elementos de navegación para evitar re-renderizados
  const navigationElements = useMemo(() => (
    navigationItems.map((item) => (
      <NavigationItemWrapper
        key={item.href}
        item={item}
        isCollapsed={isCollapsed}
        pathname={pathname}
        onItemClick={onMobileClose}
        expandedItems={expandedItems}
        onToggleExpanded={toggleExpanded}
      />
    ))
  ), [isCollapsed, pathname, onMobileClose, expandedItems, toggleExpanded]);

  // Memoizar el header del sidebar
  const sidebarHeader = useMemo(() => (
    <div className="p-3 sm:p-4 md:p-5 lg:p-6 border-b border-border/50 bg-gradient-to-r from-background to-background/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-primary-foreground font-bold text-sm sm:text-base md:text-lg">G</span>
          </div>
          <div className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out",
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">GardOps</h2>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground whitespace-nowrap">Sistema de Gestión</p>
          </div>
        </div>
        
        {/* Botón X para cerrar en móvil - Responsive */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileClose}
          className="lg:hidden p-1.5 sm:p-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-accent/50 border border-border/30 hover:bg-accent/70 touch-manipulation active:scale-95 transition-transform"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  ), [isCollapsed, onMobileClose]);

  // Memoizar el footer del sidebar
  const sidebarFooter = useMemo(() => (
    <div className="p-3 sm:p-4 md:p-5 lg:p-6 border-t border-border/50">
      {!isCollapsed ? (
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          {/* Collapse toggle button - solo visible en desktop - Responsive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="w-full hidden lg:flex items-center gap-1.5 sm:gap-2 text-foreground hover:text-primary hover:bg-accent/50 transition-colors duration-200 border border-border/30 hover:border-border/60 font-medium touch-manipulation active:scale-[0.98] h-8 sm:h-9 md:h-10"
          >
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border border-current rounded-sm flex items-center justify-center">
              <ChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm">Colapsar menú</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          {/* Expand toggle button - solo visible en desktop - Responsive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="w-full hidden lg:flex items-center justify-center text-foreground hover:text-primary hover:bg-accent/50 transition-colors duration-200 border border-border/30 hover:border-border/60 touch-manipulation active:scale-[0.98] h-8 sm:h-9 md:h-10"
          >
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}
    </div>
  ), [isCollapsed, toggleCollapse]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar unificado - Ultra Responsive */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[70] h-full bg-background/95 backdrop-blur-sm border-r border-border/50 shadow-lg transition-all duration-500 ease-in-out",
          // Desktop: sidebar colapsable
          "lg:relative lg:z-auto",
          // Móvil: overlay con animación
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Ancho ultra responsive
          isCollapsed ? "w-16 sm:w-18 md:w-20" : "w-52 sm:w-60 md:w-64",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header - Ultra Responsive */}
          {sidebarHeader}

          {/* Navigation - Ultra Responsive */}
          <nav className="flex-1 p-2 sm:p-3 md:p-4 space-y-1 sm:space-y-1.5 md:space-y-2 overflow-y-auto">
            {navigationElements}
          </nav>

          {/* Footer - Ultra Responsive */}
          {sidebarFooter}
        </div>
      </aside>
    </>
  );
}); 