import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { headers } from 'next/headers'
import { getCurrentUserServer } from '@/lib/auth'

// Asegurar runtime Node.js (jsonwebtoken y postgres no funcionan en Edge)
export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const perm = url.searchParams.get('perm') || url.searchParams.get('permiso')
    if (!perm) return NextResponse.json({ ok:false, error:'perm requerido', code:'BAD_REQUEST' }, { status:400 })

    const h = headers()
    const fromHeader = h.get('x-user-email') || h.get('x-user-email(next/headers)')
    const userFromJwt = getCurrentUserServer(req as any)
    const fromJwt = userFromJwt?.email || null
    const isDev = process.env.NODE_ENV !== 'production'
    const dev = isDev ? process.env.NEXT_PUBLIC_DEV_USER_EMAIL : undefined
    const email = fromJwt || fromHeader || dev
    
    // Fallback maestro: usuarios con rol JWT 'admin' tienen acceso total
    if (userFromJwt?.rol === 'admin') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[me/permissions][GET] admin override (JWT rol=admin)', { email, perm })
      }
      return NextResponse.json({ ok:true, email, perm, allowed: true, override: 'jwt_admin' })
    }
    if (!email) return NextResponse.json({ ok:false, error:'no-auth', code:'UNAUTHENTICATED' }, { status:401 })

    if (process.env.NODE_ENV !== 'production') {
      console.log('[me/permissions][GET] params', { email, perm })
    }
    // Buscar userId primero para evitar pasar NULL a la función
    let userId: string | null = null
    try {
      const userRow = await sql<{ id: string }>`
        select id::text as id from public.usuarios where lower(email)=lower(${email}) limit 1
      `
      userId = userRow?.rows?.[0]?.id ?? null
    } catch (e:any) {
      console.error('[me/permissions][GET] user lookup error', e?.message || e)
      // Si falla la BD: no devolver 500 para no bloquear la UI
      if (userFromJwt?.rol === 'admin') {
        return NextResponse.json({ ok:true, email, perm, allowed:true, override:'jwt_admin_db_error' })
      }
      return NextResponse.json({ ok:true, email, perm, allowed:false, reason:'db_error' })
    }
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') console.warn('[me/permissions][GET] usuario no encontrado', { email })
      // Para admin por cookie (rol=admin) aunque el usuario aún no exista en usuarios, permitir sin bloquear la UI
      if (userFromJwt?.rol === 'admin') {
        return NextResponse.json({ ok:true, email, perm, allowed:true, override:'jwt_admin_user_missing' })
      }
      return NextResponse.json({ ok:true, email, perm, allowed:false, reason:'user_not_found' })
    }
    let allowed = false
    try {
      const { rows } = await sql`
        select (
          public.fn_usuario_tiene_permiso(${userId}::uuid, ${perm})
          OR public.fn_usuario_tiene_permiso(${userId}::uuid, ${'rbac.platform_admin'})
        ) as allowed
      `
      allowed = rows?.[0]?.allowed === true
    } catch (e:any) {
      console.error('[me/permissions][GET] SQL error', e?.message || e)
      // No reventar la UI; devolver allowed=false
      allowed = false
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[me/permissions][GET] result', { email, perm, allowed })
    }
    return NextResponse.json({ ok:true, email, perm, allowed })
  } catch (err:any) {
    console.error('[me/permissions][GET] error', err)
    return NextResponse.json({ ok:false, error:'internal', detail: String(err?.message ?? err), code:'INTERNAL' }, { status:500 })
  }
}


