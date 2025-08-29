"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { navigationItems } from "../../lib/navigation";
import { useFlag } from "@/lib/flags.client";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { NavigationItemWrapper } from "./navigation-item-wrapper";

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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const adoV2On = useFlag('ado_v2');

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

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isItemActive = (item: any) => {
    if (item.href === pathname) return true;
    if (item.children) {
      return item.children.some((child: any) => child.href === pathname);
    }
    return false;
  };

  const renderNavigationItem = (item: any, level: number = 0) => {
    const isActive = isItemActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isChildActive = hasChildren && item.children.some((child: any) => child.href === pathname);

    return (
      <div key={item.href}>
        <div className="relative">
          <Link
            href={item.href}
            onClick={() => {
              onMobileClose?.();
              if (hasChildren) {
                toggleExpanded(item.name);
              }
            }}
            className={cn(
              "sidebar-item text-xs sm:text-sm md:text-base touch-manipulation active:scale-[0.98] transition-all",
              isActive && "active",
              isCollapsed && "justify-center px-1 sm:px-1.5 md:px-2",
              level > 0 && "ml-4",
              hasChildren && "cursor-pointer"
            )}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate text-xs sm:text-sm md:text-base flex items-center gap-2">
                    {item.name}
                    
                  </span>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                {hasChildren && (
                  <ChevronDown 
                    className={cn(
                      "h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} 
                  />
                )}
              </>
            )}
          </Link>
        </div>

        {/* Submenú */}
        {hasChildren && !isCollapsed && (
          <div className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="space-y-1 mt-1">
              {item.children.map((child: any) => {
                const isChildActive = child.href === pathname;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => onMobileClose?.()}
                    className={cn(
                      "sidebar-item text-xs sm:text-sm md:text-base touch-manipulation active:scale-[0.98] transition-all ml-4",
                      isChildActive && "active"
                    )}
                  >
                    <child.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate text-xs sm:text-sm md:text-base">{child.name}</span>
                      {child.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {child.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
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

          {/* Navigation - Ultra Responsive */}
          <nav className="flex-1 p-2 sm:p-3 md:p-4 space-y-1 sm:space-y-1.5 md:space-y-2 overflow-y-auto">
            {navigationItems.map((item) => (
              <NavigationItemWrapper
                key={item.href}
                item={item}
                isCollapsed={isCollapsed}
                pathname={pathname}
                onItemClick={onMobileClose}
                expandedItems={expandedItems}
                onToggleExpanded={toggleExpanded}
              />
            ))}
          </nav>


          {/* Footer - Ultra Responsive */}
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
        </div>
      </aside>
    </>
  );
} 