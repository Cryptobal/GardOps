import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'read:list' });
  if (deny) return deny;

  try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    
    // Solo Platform Admin puede verificar permisos
    const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
    if (!isPlatformAdmin) {
      return NextResponse.json({ ok:false, error:'unauthorized', code:'UNAUTHORIZED' }, { status:403 });
    }

    // Obtener todos los permisos
    const permisosResult = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;

    const permisos = permisosResult.rows;

    // Contar por categoría
    const conteoPorCategoria = await sql`
      SELECT categoria, COUNT(*) as total
      FROM permisos
      GROUP BY categoria
      ORDER BY categoria NULLS FIRST
    `;

    return NextResponse.json({
      ok: true,
      totalPermisos: permisos.length,
      permisos: permisos.map(p => ({
        id: p.id,
        clave: p.clave,
        descripcion: p.descripcion,
        categoria: p.categoria
      })),
      conteoPorCategoria: conteoPorCategoria.rows
    });

  } catch (error) {
    console.error('Error verificando permisos:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
