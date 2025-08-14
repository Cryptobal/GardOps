import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'admin', action: 'create' });
if (deny) return deny;

  try {
    console.log('[admin/rbac/fix-admin-permissions][POST] - Arreglando permisos del rol admin');

    // 1. Buscar el rol de admin
    const adminRole = await sql`
      SELECT id, nombre, descripcion
      FROM roles 
      WHERE nombre = 'admin' AND tenant_id IS NULL
      LIMIT 1
    `;

    if (adminRole.rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Rol admin no encontrado' }, { status: 404 });
    }

    const roleId = adminRole.rows[0].id;

    // 2. Obtener todos los permisos de clientes
    const permisosClientes = await sql`
      SELECT id, clave, descripcion
      FROM permisos
      WHERE clave LIKE 'clientes.%' OR clave = 'clientes.*'
      ORDER BY clave
    `;

    console.log(`Encontrados ${permisosClientes.rows.length} permisos de clientes`);

    // 3. Asignar todos los permisos de clientes al rol de admin
    for (const permiso of permisosClientes.rows) {
      await sql`
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES (${roleId}, ${permiso.id})
        ON CONFLICT DO NOTHING
      `;
    }

    // 4. Verificar el resultado
    const permisosAsignados = await sql`
      SELECT 
        p.clave,
        p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${roleId}
      AND p.clave LIKE 'clientes.%'
      ORDER BY p.clave
    `;

    console.log('✅ Permisos de clientes asignados al rol admin');

    return NextResponse.json({ 
      ok: true,
      message: 'Permisos de clientes asignados exitosamente',
      permisosAsignados: permisosAsignados.rows,
      totalPermisos: permisosAsignados.rows.length
    });

  } catch (err: any) {
    console.error('[admin/rbac/fix-admin-permissions][POST] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}
