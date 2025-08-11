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
              <span className="sidebar-item-text">{item.name}</span>
              {hasVisibleChildren && (
                <span className={cn(
                  "ml-auto transition-transform",
                  isExpanded && "rotate-90"
                )}>
                  ›
                </span>
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
