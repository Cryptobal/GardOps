import { NextRequest } from 'next/server';
import { userHas } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const perm = req.nextUrl.searchParams.get('perm');
  if (!perm) return new Response('perm required', { status: 400 });
  const ok = await userHas(perm);
  return new Response(null, { status: ok ? 204 : 403 });
}


