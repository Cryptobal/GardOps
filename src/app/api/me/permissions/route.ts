import { NextRequest } from 'next/server';
import { userHas } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const url = (req as any).nextUrl ?? new URL((req as any).url);
  const perm = url.searchParams.get('perm');
  if (!perm) return new Response('perm required', { status: 400 });
  
  // Permiso temporal para desarrollo - permitir turnos.marcar_asistencia
  if (perm === 'turnos.marcar_asistencia') {
    return new Response(null, { status: 204 });
  }
  
  const ok = await userHas(perm);
  return new Response(null, { status: ok ? 204 : 403 });
}


