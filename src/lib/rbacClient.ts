"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

export async function rbacFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});

  // Intentar obtener el email del usuario autenticado
  let userEmail = null;
  
  // Solo inyectar cabecera de desarrollo cuando realmente estamos en desarrollo.
  // Evita suplantar al usuario autenticado en ambientes reales.
  const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  const isDev = process.env.NODE_ENV !== 'production';
  
  // En desarrollo, siempre inyectar el header x-user-email si no está presente
  if (isDev && devEmail && !headers.has('x-user-email')) {
    headers.set('x-user-email', devEmail);
    userEmail = devEmail;
  }
  
  // En producción, intentar obtener el email del usuario autenticado
  if (!userEmail && typeof document !== 'undefined') {
    // Intentar obtener desde tenant cookie
    const tenantCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('tenant='))
      ?.split('=')[1];
    
    if (tenantCookie) {
      try {
        const tenantInfo = JSON.parse(decodeURIComponent(tenantCookie));
        userEmail = tenantInfo.email;
      } catch (parseError) {
        logger.warn('[rbacFetch] Error parseando cookie tenant:', parseError);
      }
    }
    
    // Intentar obtener desde localStorage
    if (!userEmail) {
      const currentUser = localStorage.getItem('current_user');
      if (currentUser) {
        try {
          const userInfo = JSON.parse(currentUser);
          userEmail = userInfo.email;
        } catch (parseError) {
          logger.warn('[rbacFetch] Error parseando localStorage current_user:', parseError);
        }
      }
    }
    
    // Intentar obtener desde JWT
    if (!userEmail) {
      const authToken = localStorage.getItem('auth_token') || 
                       document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/)?.[1];
      if (authToken) {
        try {
          const parts = authToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            userEmail = payload.email;
          }
        } catch (parseError) {
          logger.warn('[rbacFetch] Error parseando JWT:', parseError);
        }
      }
    }
    
    // Si se obtuvo un email, agregarlo al header
    if (userEmail && !headers.has('x-user-email')) {
      headers.set('x-user-email', userEmail);
      logger.debug('[rbacFetch] Agregando x-user-email header:', userEmail);
    }
  }

  const method = (init.method || 'GET').toUpperCase();
  if ((method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Protección: evitar llamadas a /api/me/permissions sin `perm=` válido
  try {
    const url = new URL(typeof input === 'string' ? input : (input as any).toString(), typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (url.pathname.startsWith('/api/me/permissions')) {
      const perm = (url.searchParams.get('perm') || url.searchParams.get('permiso') || '').trim();
      if (!perm) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('[rbacFetch] /api/me/permissions con perm vacío — se omite request y se asume allowed=false');
        }
        // Devolver Response simulada coherente (denegar por defecto)
        const body = JSON.stringify({ ok: true, allowed: false, skipped: true });
        return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
      }
    }
  } catch {}

  return fetch(input, { ...init, headers });
}


