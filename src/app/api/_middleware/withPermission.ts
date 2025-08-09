import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth';

export function withPermission<T extends (req: NextRequest) => Promise<Response>>(permission: string, handler: T) {
  return async (req: NextRequest) => {
    try {
      await requirePermission(permission);
      return handler(req);
    } catch (e: any) {
      const msg = e?.message === 'FORBIDDEN' ? 'Forbidden' : 'Unauthorized';
      return new Response(msg, { status: 403 });
    }
  };
}


