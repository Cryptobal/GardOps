"use client";

import { NavigationItem } from "@/lib/navigation";
import { useCan } from "@/lib/permissions";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useFlag } from "@/lib/flags.client";

interface NavigationItemWrapperProps {
  item: NavigationItem;
  level?: number;
  isCollapsed?: boolean;
  pathname?: string;
  onItemClick?: () => void;
  expandedItems?: string[];
  onToggleExpanded?: (itemName: string) => void;
}

export function NavigationItemWrapper({
  item,
  level = 0,
  isCollapsed = false,
  pathname = "",
  onItemClick,
  expandedItems = [],
  onToggleExpanded
}: NavigationItemWrapperProps) {
  const { allowed, loading } = item.permission 
    ? useCan(item.permission)
    : { allowed: true, loading: false };
  const adoV2On = useFlag('ado_v2');

  // Si tiene permiso requerido y está cargando, no mostrar nada
  if (item.permission && loading) {
    return null;
  }

  // Si tiene permiso requerido y no está permitido, no mostrar nada
  if (item.permission && !allowed) {
    return null;
  }

  // Filtrar hijos basándose en permisos
  const visibleChildren = item.children?.filter(child => {
    // Si el hijo no requiere permiso, es visible
    if (!child.permission) return true;
    // Si requiere permiso, se manejará dentro del componente hijo
    return true;
  }) || [];

  const hasVisibleChildren = visibleChildren.length > 0;
  const isExpanded = expandedItems.includes(item.name);
  const isActive = pathname === item.href;
  const isChildActive = hasVisibleChildren && 
    visibleChildren.some((child: NavigationItem) => pathname === child.href);

  return (
    <div>
      <div className="relative">
        <Link
          href={item.href}
          onClick={() => {
            onItemClick?.();
            if (hasVisibleChildren && onToggleExpanded) {
              onToggleExpanded(item.name);
            }
          }}
          className={cn(
            "sidebar-item text-xs sm:text-sm md:text-base touch-manipulation active:scale-[0.98] transition-all",
            isActive && "active",
            isCollapsed && "justify-center px-1 sm:px-1.5 md:px-2",
            level > 0 && "ml-4",
            hasVisibleChildren && "cursor-pointer"
          )}
          title={isCollapsed ? item.name : undefined}
        >
          <item.icon className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 flex-shrink-0" />
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate text-xs sm:text-sm md:text-base flex items-center gap-2">
                  {item.name}
                  {item.href === "/pauta-diaria" && adoV2On && (
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase tracking-wide">v2</span>
                  )}
                </span>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.description}
                  </p>
                )}
              </div>
              {hasVisibleChildren && (
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

      {/* Renderizar hijos si están expandidos y no está colapsado */}
      {!isCollapsed && hasVisibleChildren && isExpanded && (
        <div className="mt-1">
          {visibleChildren.map((child) => (
            <NavigationItemWrapper
              key={child.href}
              item={child}
              level={level + 1}
              isCollapsed={isCollapsed}
              pathname={pathname}
              onItemClick={onItemClick}
              expandedItems={expandedItems}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
