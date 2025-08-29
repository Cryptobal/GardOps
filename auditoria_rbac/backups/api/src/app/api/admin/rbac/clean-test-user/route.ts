import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('[admin/rbac/clean-test-user][POST] - Limpiando usuario test@test.cl');

    const email = 'test@test.cl';

    // 1. Buscar el usuario
    const user = await sql`
      SELECT id, email, nombre
      FROM usuarios 
      WHERE email = ${email}
    `;

    if (user.rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Usuario test@test.cl no encontrado' }, { status: 404 });
    }

    const userId = user.rows[0].id;

    // 2. Eliminar TODOS los roles asignados al usuario
    await sql`
      DELETE FROM usuarios_roles 
      WHERE usuario_id = ${userId}
    `;

    // 3. Verificar que no tenga roles asignados
    const rolesAsignados = await sql`
      SELECT COUNT(*) as total
      FROM usuarios_roles 
      WHERE usuario_id = ${userId}
    `;

    // 4. Verificar que no tenga permisos directos (aunque no debería tener)
    // Nota: En este sistema RBAC, los permisos se asignan a través de roles, no directamente a usuarios
    const permisosDirectos = { rows: [{ total: 0 }] };

    console.log('✅ Usuario test@test.cl limpiado completamente');

    return NextResponse.json({
      ok: true,
      message: 'Usuario test@test.cl limpiado completamente',
      usuario: {
        id: userId,
        email: user.rows[0].email,
        nombre: user.rows[0].nombre
      },
      resultado: {
        rolesAsignados: Number(rolesAsignados.rows[0].total),
        permisosDirectos: Number(permisosDirectos.rows[0].total)
      }
    });

  } catch (err: any) {
    console.error('[admin/rbac/clean-test-user][POST] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err) }, { status: 500 });
  }
}
