"use client";

import { NavigationItem } from "@/lib/navigation";
import { useCan } from "@/lib/permissions";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useFlag } from "@/lib/flags.context";
import React, { useMemo } from "react";

interface NavigationItemWrapperProps {
  item: NavigationItem;
  level?: number;
  isCollapsed?: boolean;
  pathname?: string;
  onItemClick?: () => void;
  expandedItems?: string[];
  onToggleExpanded?: (itemName: string) => void;
}

export const NavigationItemWrapper = React.memo(function NavigationItemWrapper({
  item,
  level = 0,
  isCollapsed = false,
  pathname = "",
  onItemClick,
  expandedItems = [],
  onToggleExpanded
}: NavigationItemWrapperProps) {
  // TODOS LOS HOOKS DEBEN IR AL INICIO, ANTES DE CUALQUIER LÓGICA CONDICIONAL
  
  // Resolver permiso; si viene vacío, no llamar API y permitir por defecto
  const perm = (item.permission || '').trim();
  const shouldCheck = !!perm;
  const { allowed: checkedAllowed, loading } = useCan(shouldCheck ? perm : undefined);
  const adoV2On = useFlag('ado_v2');
  
  // Bypass rápido en cliente: si el JWT tiene rol admin, mostrar ítems sin esperar
  const adminBypass = useMemo(() => {
    try {
      if (typeof document !== 'undefined') {
        const m = (document.cookie || '').match(/(?:^|;\s*)auth_token=([^;]+)/);
        const token = m?.[1] ? decodeURIComponent(m[1]) : null;
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1] || '')) || {};
          return payload?.rol === 'admin';
        }
      }
    } catch {}
    return false;
  }, []);
  
  const allowed = shouldCheck ? checkedAllowed : true;

  // Filtrar hijos basándose en permisos
  const visibleChildren = useMemo(() => {
    return item.children?.filter(child => {
      // Si el hijo no requiere permiso, es visible
      if (!child.permission) return true;
      // Si requiere permiso, se manejará dentro del componente hijo
      return true;
    }) || [];
  }, [item.children]);

  const hasVisibleChildren = visibleChildren.length > 0;
  const isExpanded = expandedItems.includes(item.name);
  
  // Lógica mejorada para detectar estado activo
  const isActive = (() => {
    // Caso directo: pathname coincide exactamente con href
    if (pathname === item.href) return true;
    
    // Caso especial: pauta diaria redirige a pauta-diaria-v2 o legacy
    if (item.href === '/pauta-diaria' && (pathname.startsWith('/pauta-diaria-v2') || pathname.startsWith('/legacy/pauta-diaria'))) return true;
    
    // Caso especial: turnos extras está dentro de pauta-diaria
    if (item.href === '/pauta-diaria/turnos-extras' && pathname.startsWith('/pauta-diaria/turnos-extras')) return true;
    
    return false;
  })();
  
  const isChildActive = hasVisibleChildren && 
    visibleChildren.some((child: NavigationItem) => pathname === child.href);

  // Memoizar el contenido del link para evitar re-renderizados
  const linkContent = useMemo(() => (
    <>
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
    </>
  ), [item.icon, item.name, item.description, isCollapsed, hasVisibleChildren, isExpanded]);

  // AHORA SÍ PODEMOS HACER RETURNS CONDICIONALES DESPUÉS DE TODOS LOS HOOKS
  
  // Si tiene permiso requerido y está cargando, no mostrar nada
  if (adminBypass) {
    // nada - continuar
  } else if (shouldCheck && loading) {
    return null;
  }

  // Si tiene permiso requerido y no está permitido, no mostrar nada
  if (!adminBypass && shouldCheck && !allowed) {
    return null;
  }

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
          {linkContent}
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
});
