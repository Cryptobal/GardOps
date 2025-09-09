import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Utilidad: tomar email desde header dev o cabecera directa
function getEmail(req: NextRequest) {
  const h = req.headers;
  const fromHeader =
    h.get('x-user-email') ||
    '';
  const fromJwt = getCurrentUserServer(req as any)?.email || '';
  const isDev = process.env.NODE_ENV !== 'production';
  const dev = isDev ? process.env.NEXT_PUBLIC_DEV_USER_EMAIL : undefined;
  return (fromJwt || fromHeader || dev || '').trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const email = getEmail(req);
    if (!email) {
      return NextResponse.json({ ok: false, error: 'No autenticado', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    logger.debug('[me/profile][GET]', { email });

    const profile = await sql<{
      id: string;
      email: string;
      nombre: string | null;
      apellido: string | null;
      activo: boolean;
      tenant_id: string | null;
      fecha_creacion: string;
    }>`
      SELECT 
        id, 
        email, 
        nombre, 
        apellido, 
        activo, 
        tenant_id,
        fecha_creacion
      FROM public.usuarios 
      WHERE lower(email) = lower(${email}) 
      LIMIT 1;
    `;

    const user = profile.rows[0];
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ 
      ok: true, 
      profile: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        activo: user.activo,
        tenant_id: user.tenant_id,
        fecha_creacion: user.fecha_creacion,
      }
    });
  } catch (err: any) {
    console.error('[me/profile][GET] error:', err);
    return NextResponse.json({ 
      ok: false, 
      error: 'internal', 
      detail: String(err?.message || err), 
      code: 'INTERNAL' 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const email = getEmail(req);
    if (!email) {
      return NextResponse.json({ ok: false, error: 'No autenticado', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as
      | { nombre?: string; apellido?: string }
      | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: 'Body inválido', code: 'BAD_REQUEST' }, { status: 400 });
    }

    const nombre = body.nombre?.trim() || null;
    const apellido = body.apellido?.trim() || null;

    logger.debug('[me/profile][PUT]', { email, nombre, apellido });

    const updated = await sql<{
      id: string;
      email: string;
      nombre: string | null;
      apellido: string | null;
      activo: boolean;
      tenant_id: string | null;
      fecha_creacion: string;
    }>`
      UPDATE public.usuarios 
      SET 
        nombre = ${nombre},
        apellido = ${apellido}
      WHERE lower(email) = lower(${email})
      RETURNING 
        id, 
        email, 
        nombre, 
        apellido, 
        activo, 
        tenant_id,
        fecha_creacion;
    `;

    const user = updated.rows[0];
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ 
      ok: true, 
      profile: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        activo: user.activo,
        tenant_id: user.tenant_id,
        fecha_creacion: user.fecha_creacion,
      }
    });
  } catch (err: any) {
    console.error('[me/profile][PUT] error:', err);
    return NextResponse.json({ 
      ok: false, 
      error: 'internal', 
      detail: String(err?.message || err), 
      code: 'INTERNAL' 
    }, { status: 500 });
  }
}
