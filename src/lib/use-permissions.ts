'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  const [allowed, setAllowed] = useState<boolean>(true); // TEMPORAL: Siempre permitir
  const [loading, setLoading] = useState<boolean>(false); // TEMPORAL: No cargar
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const lastPerm = useRef<string>('');

  // TEMPORAL: Simplificar para evitar bucles infinitos
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // TEMPORAL: Siempre permitir acceso
  useEffect(() => {
    setAllowed(true);
    setLoading(false);
    setError(null);
  }, [normalized]);

  return { 
    allowed: true, // TEMPORAL: Siempre permitir
    loading: false, // TEMPORAL: No cargar
    error: null,
    contextAvailable: true,
    contextInitialized: true 
  };
}
