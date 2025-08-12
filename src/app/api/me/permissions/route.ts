import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { headers } from 'next/headers'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const perm = url.searchParams.get('perm') || url.searchParams.get('permiso')
    if (!perm) return NextResponse.json({ ok:false, error:'perm requerido', code:'BAD_REQUEST' }, { status:400 })

    const h = headers()
    const fromHeader = h.get('x-user-email') || h.get('x-user-email(next/headers)')
    const dev = process.env.NEXT_PUBLIC_DEV_USER_EMAIL
    const email = fromHeader || dev
    if (!email) return NextResponse.json({ ok:false, error:'no-auth', code:'UNAUTHENTICATED' }, { status:401 })

    console.log('[me/permissions][GET] params', { email, perm })
    console.log('[me/permissions][GET] SQL', {
      text: 'with me as (select id from public.usuarios where lower(email)=lower($1) limit 1) select public.fn_usuario_tiene_permiso((select id from me), $2) as allowed',
      values: [email, perm]
    })
    const { rows } = await sql`
      with me as (
        select id from public.usuarios where lower(email)=lower(${email}) limit 1
      )
      select public.fn_usuario_tiene_permiso((select id from me), ${perm}) as allowed
    `
    const allowed = rows?.[0]?.allowed === true
    return NextResponse.json({ ok:true, email, perm, allowed })
  } catch (err:any) {
    console.error('[me/permissions][GET] error', err)
    return NextResponse.json({ ok:false, error:'internal', detail: String(err?.message ?? err), code:'INTERNAL' }, { status:500 })
  }
}


