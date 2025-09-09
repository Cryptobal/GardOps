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

export async function PUT(req: NextRequest) {
  try {
    const email = getEmail(req);
    if (!email) {
      return NextResponse.json({ ok: false, error: 'No autenticado', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as
      | { currentPassword?: string; newPassword?: string }
      | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: 'Body inválido', code: 'BAD_REQUEST' }, { status: 400 });
    }

    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: 'Contraseña actual y nueva contraseña son requeridas', code: 'BAD_REQUEST' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres', code: 'BAD_REQUEST' }, { status: 400 });
    }

    logger.debug('[me/password][PUT]', { email, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

    // Verificar que la contraseña actual sea correcta
    const currentUser = await sql<{ id: string; password: string }>`
      SELECT id, password 
      FROM public.usuarios 
      WHERE lower(email) = lower(${email}) 
      LIMIT 1;
    `;

    const user = currentUser.rows[0];
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Verificar contraseña actual
    const passwordCheck = await sql<{ matches: boolean }>`
      SELECT (password = crypt(${currentPassword}, password)) as matches
      FROM public.usuarios 
      WHERE id = ${user.id};
    `;

    if (!passwordCheck.rows[0]?.matches) {
      return NextResponse.json({ ok: false, error: 'Contraseña actual incorrecta', code: 'INVALID_PASSWORD' }, { status: 400 });
    }

    // Actualizar contraseña
    const updated = await sql`
      UPDATE public.usuarios 
      SET password = crypt(${newPassword}, gen_salt('bf'))
      WHERE id = ${user.id}
      RETURNING id;
    `;

    if (!updated.rows[0]) {
      return NextResponse.json({ ok: false, error: 'Error al actualizar contraseña', code: 'UPDATE_FAILED' }, { status: 500 });
    }

    logger.debug('[me/password][PUT] success', { email });

    return NextResponse.json({ 
      ok: true, 
      message: 'Contraseña actualizada correctamente'
    });
  } catch (err: any) {
    console.error('[me/password][PUT] error:', err);
    return NextResponse.json({ 
      ok: false, 
      error: 'internal', 
      detail: String(err?.message || err), 
      code: 'INTERNAL' 
    }, { status: 500 });
  }
}
