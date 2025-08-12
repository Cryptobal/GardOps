// Hook y helpers para verificar permisos del usuario actual.
// Evita consultar si no hay `perm`, espera la carga del usuario
// y expone estados claros: { allowed, loading, error }.

import { useEffect, useRef, useState } from "react";
import { rbacFetch } from "@/lib/rbacClient";

async function fetchCan(perm: string): Promise<boolean> {
  const url = `/api/me/permissions?perm=${encodeURIComponent(perm)}`;
  // Usar rbacFetch para que agregue x-user-email en dev
  const res = await rbacFetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`/permissions ${res.status}`);
  const data = await res.json();
  return !!data?.allowed;
}

// Pequeño caché en memoria para evitar re-consultas durante la sesión
const canCache = new Map<string, boolean>();

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
    // Si no hay permiso definido, no bloqueamos la UI y marcamos allowed=true.
    if (!normalized) {
      setAllowed(true);
      setLoading(false);
      setError(null);
      return;
    }

    // ¿Ya lo tenemos cacheado?
    if (canCache.has(normalized)) {
      setAllowed(canCache.get(normalized) ?? false);
      setLoading(false);
      setError(null);
      return;
    }

    let cancel = false;
    setLoading(true);
    setError(null);
    fetchCan(normalized)
      .then((ok) => {
        if (cancel || !mounted.current) return;
        canCache.set(normalized, ok);
        setAllowed(ok);
      })
      .catch((e) => {
        if (cancel || !mounted.current) return;
        setError(e?.message ?? "error");
        setAllowed(false);
      })
      .finally(() => {
        if (cancel || !mounted.current) return;
        setLoading(false);
      });

    return () => { cancel = true; };
  }, [normalized]);

  return { allowed: !!allowed, loading, error };
}

// Helper sin hook (por si se usa en server actions)
export async function can(perm: string): Promise<boolean> {
  if (!perm?.trim()) return true;
  if (canCache.has(perm)) return canCache.get(perm) ?? false;
  const ok = await fetchCan(perm);
  canCache.set(perm, ok);
  return ok;
}

 
