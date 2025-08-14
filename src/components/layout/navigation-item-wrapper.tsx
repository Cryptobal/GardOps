"use client";

import { NavigationItem } from "@/lib/navigation";
import { usePermissions } from "@/lib/use-permissions";
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
  // Resolver permiso; si viene vacío, no llamar API y permitir por defecto
  const perm = (item.permission || '').trim();
  const shouldCheck = !!perm;
  const { allowed: checkedAllowed, loading } = usePermissions(shouldCheck ? perm : undefined);
  // Bypass rápido en cliente: si el JWT tiene rol admin, mostrar ítems sin esperar
  let adminBypass = false;
  try {
    if (typeof document !== 'undefined') {
      const m = (document.cookie || '').match(/(?:^|;\s*)auth_token=([^;]+)/);
      const token = m?.[1] ? decodeURIComponent(m[1]) : null;
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1] || '')) || {};
        adminBypass = payload?.rol === 'admin';
      }
    }
  } catch {}
  const allowed = shouldCheck ? checkedAllowed : true;
  const adoV2On = useFlag('ado_v2');

  // Si es admin, mostrar siempre
  if (adminBypass) {
    // Continuar con el renderizado
  } else if (shouldCheck && loading) {
    // Si está cargando y no es admin, no mostrar nada temporalmente
    return null;
  } else if (shouldCheck && !allowed) {
    // Si no tiene permiso y no es admin, no mostrar nada
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
