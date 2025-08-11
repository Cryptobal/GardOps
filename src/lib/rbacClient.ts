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

  return fetch(input, { ...init, headers });
}


