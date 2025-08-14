import { requireAuthz } from '@/lib/authz-api'
export const runtime = 'edge';

export async function GET() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'me', action: 'read:list' });
if (deny) return deny;

  return new Response(JSON.stringify({ ok: true, now: Date.now() }), {
    headers: { 'content-type': 'application/json' },
  });
}
