'use client';

import { useEffect, useState } from 'react';

/**
 * Cliente: verifica permisos llamando al nuevo endpoint RBAC con fallback a legacy
 */
export async function can(userId: string, permiso: string): Promise<boolean> {
  try {
    // Intentar nuevo sistema RBAC
    const response = await fetch(`/api/rbac/can?permiso=${encodeURIComponent(permiso)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[rbac] can(${permiso})=${data.allowed} (new)`);
      return data.allowed;
    }
    
    // Si falla con 404 o 500, fallback a legacy
    if (response.status === 404 || response.status >= 500) {
      console.log(`[rbac] fallback to legacy for ${permiso} (status=${response.status})`);
      return fallbackToLegacy(permiso);
    }
    
    // Para otros errores (401, 403), asumir sin permiso
    console.log(`[rbac] can(${permiso})=false (error ${response.status})`);
    return false;
  } catch (error) {
    // Error de red o similar, usar fallback
    console.log(`[rbac] fallback to legacy for ${permiso} (network error)`);
    return fallbackToLegacy(permiso);
  }
}

/**
 * Fallback al sistema legacy de permisos
 */
async function fallbackToLegacy(permiso: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/me/permissions?perm=${encodeURIComponent(permiso)}`, {
      cache: 'no-store'
    });
    const allowed = response.ok && response.status === 204;
    console.log(`[rbac] can(${permiso})=${allowed} (legacy)`);
    return allowed;
  } catch {
    console.log(`[rbac] can(${permiso})=false (legacy error)`);
    return false;
  }
}

/**
 * Hook React para verificar permisos con cache y estado de carga
 */
export function useCan(permiso: string): { allowed: boolean; loading: boolean } {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      try {
        setLoading(true);
        
        // TEMPORAL: Usar directamente legacy hasta que RBAC esté configurado
        // Esto evita el error 500 y los logs molestos
        const legacyAllowed = await fallbackToLegacy(permiso);
        if (!cancelled) {
          setAllowed(legacyAllowed);
          setLoading(false);
        }
        return;
        
        // Código RBAC comentado temporalmente
        /*
        // Primero intentar nuevo sistema RBAC
        const response = await fetch(`/api/rbac/can?permiso=${encodeURIComponent(permiso)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!cancelled) {
          if (response.ok) {
            const data = await response.json();
            console.log(`[rbac] useCan(${permiso})=${data.allowed} (new)`);
            setAllowed(data.allowed);
            setLoading(false);
            return;
          }
          
          // Fallback a legacy si hay error 404/500
          if (response.status === 404 || response.status >= 500) {
            console.log(`[rbac] useCan fallback to legacy for ${permiso}`);
            const legacyAllowed = await fallbackToLegacy(permiso);
            setAllowed(legacyAllowed);
            setLoading(false);
            return;
          }
          
          // Otros errores = sin permiso
          console.log(`[rbac] useCan(${permiso})=false (error ${response.status})`);
          setAllowed(false);
          setLoading(false);
        }
        */
      } catch (error) {
        if (!cancelled) {
          // Error, usar fallback
          console.log(`[rbac] useCan error for ${permiso}, defaulting to false`);
          setAllowed(false);
          setLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [permiso]);
  
  return { allowed, loading };
}

/**
 * Función para verificar permisos de forma asíncrona (compatible con el API legacy)
 * Esta función mantiene la misma interfaz que la original para compatibilidad
 */
export async function fetchCan(permission: string): Promise<boolean> {
  try {
    // Intentar nuevo sistema RBAC primero
    const response = await fetch(`/api/rbac/can?permiso=${encodeURIComponent(permission)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[rbac] fetchCan(${permission})=${data.allowed} (new)`);
      return data.allowed;
    }
    
    // Fallback a legacy si hay error 404/500
    if (response.status === 404 || response.status >= 500) {
      console.log(`[rbac] fetchCan fallback to legacy for ${permission}`);
      return fallbackToLegacy(permission);
    }
    
    // Otros errores = sin permiso
    return false;
  } catch {
    // Error de red, usar fallback
    return fallbackToLegacy(permission);
  }
}
