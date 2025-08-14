import { requireAuthz } from '@/lib/authz-api'
export const runtime = 'edge';

export async function GET(req: Request) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'debug', action: 'read:list' });
if (deny) return deny;

  // Lee headers igual que los usa la app
  const fromFetch = req.headers.get('x-user-email') || null;
  // Nota: next/headers no existe en edge, así evitamos cuelgues

  const env = process.env.NEXT_PUBLIC_DEV_USER_EMAIL || null;
  const now = Date.now();

  return new Response(
    JSON.stringify({ ok: true, now, email: fromFetch, envDevEmail: env }),
    { headers: { 'content-type': 'application/json' } }
  );
}


