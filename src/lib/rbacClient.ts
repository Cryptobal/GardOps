"use client";

export async function rbacFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});

  const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  if (devEmail && !headers.has('x-user-email')) {
    headers.set('x-user-email', devEmail);
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
          console.warn('[rbacFetch] /api/me/permissions con perm vacío — se omite request y se asume allowed=true');
        }
        // Devolver Response simulada de allowed=true
        const body = JSON.stringify({ ok: true, allowed: true, skipped: true });
        return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
      }
    }
  } catch {}

  return fetch(input, { ...init, headers });
}


