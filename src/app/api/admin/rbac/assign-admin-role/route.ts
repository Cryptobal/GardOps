import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'admin', action: 'create' });
if (deny) return deny;

  try {
    console.log('[admin/rbac/assign-admin-role][POST] - Asignando rol de admin');

    const email = 'carlos.irigoyen@gard.cl';

    // 1. Verificar que el permiso rbac.platform_admin existe
    await sql`
      INSERT INTO permisos (clave, descripcion, categoria)
      VALUES ('rbac.platform_admin', 'Administrador de la plataforma - acceso total al sistema RBAC', 'RBAC')
      ON CONFLICT (clave) DO NOTHING
    `;

    // 2. Buscar o crear el rol de admin global
    const adminRole = await sql`
      INSERT INTO roles (nombre, descripcion, tenant_id)
      VALUES ('admin', 'Administrador del sistema', NULL)
      ON CONFLICT (tenant_id, nombre) DO UPDATE SET
        descripcion = EXCLUDED.descripcion
      RETURNING id, nombre, descripcion
    `;

    const roleId = adminRole.rows[0].id;

    // 3. Asignar TODOS los permisos al rol de admin
    await sql`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      SELECT ${roleId}, p.id
      FROM permisos p
      ON CONFLICT DO NOTHING
    `;

    // 4. Asignar el rol de admin al usuario
    await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      SELECT u.id, ${roleId}
      FROM usuarios u
      WHERE u.email = ${email}
      ON CONFLICT DO NOTHING
    `;

    // 5. Verificar el resultado
    const resultado = await sql`
      SELECT 
        u.email,
        r.nombre as rol,
        COUNT(p.id) as total_permisos
      FROM usuarios u
      JOIN usuarios_roles ur ON ur.usuario_id = u.id
      JOIN roles r ON r.id = ur.rol_id
      JOIN roles_permisos rp ON rp.rol_id = r.id
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE u.email = ${email}
      GROUP BY u.email, r.nombre
    `;

    console.log('✅ Rol de admin asignado exitosamente');

    return NextResponse.json({ 
      ok: true,
      message: 'Rol de admin asignado exitosamente',
      resultado: resultado.rows
    });

  } catch (err: any) {
    console.error('[admin/rbac/assign-admin-role][POST] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}
