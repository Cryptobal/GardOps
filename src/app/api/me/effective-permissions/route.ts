import { NextResponse } from 'next/server'
import { loadEffectivePermissions } from '@/lib/authz-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const eff = await loadEffectivePermissions(req)
    return NextResponse.json({ ok: true, effective: eff })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:'internal' }, { status: 500 })
  }
}


