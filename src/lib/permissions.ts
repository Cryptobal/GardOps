// Hook y helpers para verificar permisos del usuario actual.
// Evita consultar si no hay `perm`, espera la carga del usuario
// y expone estados claros: { allowed, loading, error }.

import { useEffect, useRef, useState } from "react";
import { rbacFetch } from "@/lib/rbacClient";

const TTL_MS = 60_000; // 1 minuto (reducido para reflejar cambios más rápido)

// Caché global para el rol del usuario
let userRoleCache: string | null = null;
let userRolePromise: Promise<string | null> | null = null;
let userRoleCacheTime: number = 0;

// Función para obtener el rol del usuario con caché de 1 minuto
async function getUserRole(): Promise<string | null> {
  const now = Date.now();
  if (userRoleCache !== null && (now - userRoleCacheTime) < 60000) {
    return userRoleCache;
  }

  if (userRolePromise) {
    return userRolePromise;
  }

  userRolePromise = (async () => {
    try {
      if (typeof window !== 'undefined') {
        const m = (document.cookie || '').match(/(?:^|;\s*)auth_token=([^;]+)/);
        const token = m?.[1] ? decodeURIComponent(m[1]) : null;
        if (token) {
          const payloadJson = atob(token.split('.')[1] || '');
          const payload = JSON.parse(payloadJson || '{}');
          const role = payload?.rol;
          userRoleCache = role || null;
          userRoleCacheTime = Date.now();
          return role || null;
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      userRolePromise = null;
    }
  })();

  return userRolePromise;
}

export async function fetchCan(perm: string): Promise<boolean> {
  const normalized = (perm || "").trim();
  if (!normalized) {
    // Sin permiso explícito, no asumimos acceso: denegamos por defecto para evitar fugas.
    // La navegación o componentes que no requieren permiso deben pasar `undefined` para no bloquear.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[useCan] perm vacío → deny-by-default (retorna false). Pasa undefined si no quieres verificar.");
    }
    return false;
  }

  // Bypass cliente: si el JWT indica rol admin, permitir sin pegarle a la API (acelera la barra)
  const userRole = await getUserRole();
  if (userRole === 'admin') {
    return true;
  }

  // Primero intentar el nuevo endpoint RBAC (más rápido y consistente)
  const urlRbac = `/api/rbac/can?perm=${encodeURIComponent(normalized)}`;
  let res = await rbacFetch(urlRbac, { cache: "no-store" });
  if (!res.ok) {
    // Fallback al legacy si falla
    const urlLegacy = `/api/me/permissions?perm=${encodeURIComponent(normalized)}`;
    res = await rbacFetch(urlLegacy, { cache: "no-store" });
  }
  if (!res.ok) {
    // En caso de error 5xx, no bloquear toda la UI.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[fetchCan] /api/me/permissions falló con status', res.status, '→ assuming true for admin UX continuity');
    }
    return true;
  }
  const data = await res.json();
  // Si la API indica override (jwt_admin), permitir explícitamente
  return data?.override === 'jwt_admin' ? true : !!data?.allowed;
}

// Caché en memoria con TTL para evitar flapping
type CacheEntry = { value: boolean; expiresAt: number };
const canCache = new Map<string, CacheEntry>();

// Función para limpiar el caché cuando hay cambios
export function clearPermissionsCache() {
  canCache.clear();
  userRoleCache = null;
  userRoleCacheTime = 0;
}

function getCachedPermission(perm: string): boolean | null {
  const entry = canCache.get(perm);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    canCache.delete(perm);
    return null;
  }
  return entry.value;
}

function setCachedPermission(perm: string, value: boolean) {
  canCache.set(perm, { value, expiresAt: Date.now() + TTL_MS });
}

export function useCan(perm?: string) {
  const normalized = (perm || "").trim();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(!!normalized);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // Si no hay permiso definido, no verificamos y permitimos por diseño del llamador.
    if (!normalized) {
      setAllowed(true);
      setLoading(false);
      setError(null);
      return;
    }

    // ¿Ya lo tenemos cacheado y vigente?
    const cached = getCachedPermission(normalized);
    if (cached !== null) {
      setAllowed(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancel = false;
    setLoading(true);
    setError(null);
    
    // Verificar rol de usuario primero para bypass rápido
    getUserRole().then(userRole => {
      if (cancel || !mounted.current) return;
      
      if (userRole === 'admin') {
        setAllowed(true);
        setLoading(false);
        setCachedPermission(normalized, true);
        return;
      }
      
      // Si no es admin, hacer la verificación normal
      return fetchCan(normalized);
    }).then((ok) => {
      if (cancel || !mounted.current) return;
      if (ok !== undefined) {
        setCachedPermission(normalized, ok);
        setAllowed(ok);
      }
    }).catch((e) => {
      if (cancel || !mounted.current) return;
      setError(e?.message ?? "error");
      setAllowed(false);
    }).finally(() => {
      if (cancel || !mounted.current) return;
      setLoading(false);
    });

    return () => { cancel = true; };
  }, [normalized]);

  return { allowed: !!allowed, loading, error };
}

// Helper sin hook (por si se usa en server actions)
export async function can(perm: string): Promise<boolean> {
  if (!perm?.trim()) return true; // Callers que no especifican permiso no requieren check
  const normalized = perm.trim();
  const cached = getCachedPermission(normalized);
  if (cached !== null) return cached;
  const ok = await fetchCan(normalized);
  setCachedPermission(normalized, ok);
  return ok;
}

 
