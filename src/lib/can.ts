'use client';

/**
 * Este archivo ahora re-exporta desde el nuevo sistema de permisos
 * para mantener compatibilidad backward con el código existente.
 * 
 * El nuevo sistema intenta usar RBAC primero y hace fallback al legacy si falla.
 */

// Re-exportar todo desde el nuevo sistema de permisos
export { useCan, fetchCan } from '@/lib/permissions';

// Mantener la función legacy original como respaldo (solo para tests o debug)
export async function fetchCanLegacy(permission: string): Promise<boolean> {
  const r = await fetch('/api/me/permissions?perm=' + encodeURIComponent(permission), { cache: 'no-store' });
  return r.ok;
}


