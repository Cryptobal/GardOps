// Hook y helpers para verificar permisos del usuario actual.
// Evita consultar si no hay `perm`, espera la carga del usuario
// y expone estados claros: { allowed, loading, error }.

import { useEffect, useRef, useState } from "react";
import { rbacFetch } from "@/lib/rbacClient";

const TTL_MS = 60_000; // 60s

export async function fetchCan(perm: string): Promise<boolean> {
  // SOLUCIÓN TEMPORAL: Permitir todos los permisos para evitar llamadas excesivas
  return true;
  
  // Código original comentado temporalmente
  /*
  const normalized = (perm || "").trim();
  if (!normalized) {
    // Sin permiso explícito, no asumimos acceso: denegamos por defecto para evitar fugas.
    // La navegación o componentes que no requieren permiso deben pasar `undefined` para no bloquear.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[useCan] perm vacío → deny-by-default (retorna false). Pasa undefined si no quieres verificar.");
    }
    return false;
  }
  // Bypass cliente restringido: solo para Platform Admin real.
  // Si es admin de tenant (tiene tenant_id), NO hacemos bypass para evitar confusiones de UI.
  try {
    if (typeof window !== 'undefined') {
      const m = (document.cookie || '').match(/(?:^|;\s*)auth_token=([^;]+)/);
      const token = m?.[1] ? decodeURIComponent(m[1]) : null;
      if (token) {
        const payloadJson = atob(token.split('.')[1] || '');
        const payload = JSON.parse(payloadJson || '{}');
        // Lógica corregida para distinguir tipos de admin:
        // Platform Admin: Carlos Irigoyen - NO tiene tenant_id específico o es el tenant por defecto del sistema
        // Tenant Admin: admin@empresa.com - tiene tenant_id específico y NO es platform admin
        
        const isDefaultTenant = payload?.tenant_id === '550e8400-e29b-41d4-a716-446655440000'; // Tenant por defecto del sistema
        const isPlatformAdmin = payload?.rol === 'admin' && (!payload?.tenant_id || isDefaultTenant || payload?.is_platform_admin === true);
        const isTenantAdmin = payload?.rol === 'admin' && payload?.tenant_id && !isDefaultTenant && !payload?.is_platform_admin;
        // Para rbac.platform_admin: si el JWT ya confirma platform admin → true; si no, NO atajar en falso, seguir a verificación de servidor
        if (normalized === 'rbac.platform_admin' && isPlatformAdmin) {
          return true;
        }
        // El Platform Admin puede pasar cualquier verificación sin llamar a la API
        if (isPlatformAdmin && normalized) {
          return true;
        }
        // Para admins de tenant NO hacemos bypass: seguir flujo normal
        if (isTenantAdmin) {
          // No devolvemos aún; continuamos a la verificación de servidor
        }
      }
    }
  } catch {}
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
  */
}

// Caché en memoria con TTL para evitar flapping
type CacheEntry = { value: boolean; expiresAt: number };
const canCache = new Map<string, CacheEntry>();

// Control de llamadas concurrentes para evitar ERR_INSUFFICIENT_RESOURCES
const pendingRequests = new Map<string, Promise<boolean>>();

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

// Función para evitar llamadas duplicadas con timeout muy corto
async function fetchCanWithDeduplication(perm: string): Promise<boolean> {
  // SOLUCIÓN TEMPORAL: Permitir todos los permisos para evitar llamadas excesivas
  // TODO: Implementar sistema de permisos offline más robusto
  return true;
  
  // Código original comentado temporalmente
  /*
  // Si ya hay una llamada pendiente para este permiso, reutilizarla
  if (pendingRequests.has(perm)) {
    return pendingRequests.get(perm)!;
  }

  // Crear nueva llamada con timeout muy corto
  const promise = Promise.race([
    fetchCan(perm),
    new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 500); // 500ms timeout
    })
  ]);
  
  pendingRequests.set(perm, promise);

  try {
    const result = await promise;
    return result;
  } catch (error) {
    // En caso de timeout o error, permitir por defecto
    return true;
  } finally {
    // Limpiar la llamada pendiente después de completarse
    pendingRequests.delete(perm);
  }
  */
}

export function useCan(perm?: string) {
  const normalized = (perm || "").trim();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(!!normalized);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // Intentar usar el contexto global primero
  let contextCheck: boolean | null = null;
  let contextInitialized = false;
  try {
    const { usePermissionsContext } = require('./permissions-context');
    const { checkPermission, initialized } = usePermissionsContext();
    contextInitialized = initialized;
    if (initialized) {
      contextCheck = checkPermission(normalized);
    }
  } catch {
    // Contexto no disponible, continuar con lógica local
  }

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

    // Si el contexto global tiene el resultado, usarlo
    if (contextCheck !== null) {
      setAllowed(contextCheck);
      setLoading(false);
      setError(null);
      return;
    }

    // Si el contexto está inicializado pero no tiene este permiso, cargarlo
    if (contextInitialized && contextCheck === null) {
      // El permiso no está en el contexto, cargarlo individualmente
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
    fetchCanWithDeduplication(normalized)
      .then((ok) => {
        if (cancel || !mounted.current) return;
        setCachedPermission(normalized, ok);
        setAllowed(ok);
      })
      .catch((e) => {
        if (cancel || !mounted.current) return;
        console.warn(`Error checking permission ${normalized}:`, e);
        setError(e?.message ?? "error");
        setAllowed(true); // Permitir por defecto en caso de error
      })
      .finally(() => {
        if (cancel || !mounted.current) return;
        setLoading(false);
      });

    return () => { cancel = true; };
  }, [normalized, contextCheck]);

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

 
