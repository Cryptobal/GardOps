'use client';

import { useEffect, useState, useRef } from 'react';
import { usePermissionsContext } from './permissions-context';
import { fetchCan } from './permissions';

// Caché local para permisos no comunes
const localCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL = 60_000; // 1 minuto

function getCachedPermission(perm: string): boolean | null {
  const entry = localCache.get(perm);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    localCache.delete(perm);
    return null;
  }
  return entry.value;
}

function setCachedPermission(perm: string, value: boolean) {
  localCache.set(perm, { value, expiresAt: Date.now() + CACHE_TTL });
}

export function usePermissions(perm?: string) {
  const normalized = (perm || "").trim();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(!!normalized);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // Intentar usar el contexto global
  let contextAvailable = false;
  let contextCheck: boolean | null = null;
  let contextInitialized = false;
  
  try {
    const { checkPermission, initialized, preloadPermissions } = usePermissionsContext();
    contextAvailable = true;
    contextInitialized = initialized;
    
    if (initialized) {
      contextCheck = checkPermission(normalized);
      
      // Si el permiso no está en el contexto, precargarlo
      if (contextCheck === null && normalized) {
        preloadPermissions([normalized]);
      }
    }
  } catch {
    // Contexto no disponible
  }

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // Si no hay permiso definido, permitir por defecto
    if (!normalized) {
      setAllowed(true);
      setLoading(false);
      setError(null);
      return;
    }

    // Si el contexto global tiene el resultado, usarlo
    if (contextAvailable && contextInitialized && contextCheck !== null) {
      setAllowed(contextCheck);
      setLoading(false);
      setError(null);
      return;
    }

    // Verificar caché local
    const cached = getCachedPermission(normalized);
    if (cached !== null) {
      setAllowed(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Si el contexto está disponible pero no inicializado, esperar
    if (contextAvailable && !contextInitialized) {
      setLoading(true);
      return;
    }

    // Cargar permiso individualmente
    let cancel = false;
    setLoading(true);
    setError(null);
    
    fetchCan(normalized)
      .then((ok) => {
        if (cancel || !mounted.current) return;
        setCachedPermission(normalized, ok);
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
  }, [normalized, contextAvailable, contextInitialized, contextCheck]);

  return { 
    allowed: !!allowed, 
    loading, 
    error,
    contextAvailable,
    contextInitialized 
  };
}
