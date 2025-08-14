import { requireAuthz } from '@/lib/authz-api'
import { NextResponse } from 'next/server'
import { loadEffectivePermissions } from '@/lib/authz-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'me', action: 'read:list' });
if (deny) return deny;

  try {
    const eff = await loadEffectivePermissions(req)
    return NextResponse.json({ ok: true, effective: eff })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:'internal' }, { status: 500 })
  }
}


