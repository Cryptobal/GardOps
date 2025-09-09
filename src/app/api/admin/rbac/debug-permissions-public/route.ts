import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'admin', action: 'read:list' });
if (deny) return deny;

  try {
    console.log('[admin/rbac/debug-permissions-public][GET] - Debug público');

    // 1. Buscar el rol de admin
    const adminRole = await sql`
      SELECT id, nombre, descripcion, tenant_id
      FROM roles 
      WHERE nombre ILIKE '%admin%' OR nombre ILIKE '%administrador%'
      ORDER BY tenant_id NULLS FIRST
    `;

    // 2. Para cada rol de admin, obtener sus permisos
    const rolesConPermisos = [];
    for (const rol of adminRole.rows) {
      const permisos = await sql`
        SELECT 
          p.id,
          p.clave,
          p.descripcion,
          p.categoria
        FROM roles_permisos rp
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE rp.rol_id = ${rol.id}
        ORDER BY p.clave
      `;

      rolesConPermisos.push({
        rol: {
          id: rol.id,
          nombre: rol.nombre,
          descripcion: rol.descripcion,
          tenant_id: rol.tenant_id
        },
        permisos: permisos.rows
      });
    }

    // 3. Obtener todos los permisos disponibles
    const allPermisos = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY clave
    `;

    // 4. Verificar permisos por módulos
    const modulos = [
      'clientes', 'instalaciones', 'guardias', 'pauta-diaria', 
      'pauta-mensual', 'documentos', 'reportes', 'payroll', 'configuracion'
    ];

    const permisosPorModulo = {};
    for (const modulo of modulos) {
      permisosPorModulo[modulo] = allPermisos.rows.filter(p => 
        p.clave.startsWith(modulo) || p.clave.includes(modulo)
      );
    }

    // 5. Verificar usuarios y sus roles
    const usuariosConRoles = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        r.nombre as rol_nombre,
        COUNT(p.id) as total_permisos
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ur.rol_id
      LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
      LEFT JOIN permisos p ON p.id = rp.permiso_id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      GROUP BY u.id, u.email, u.nombre, r.nombre
    `;

    return NextResponse.json({ 
      ok: true,
      rolesAdmin: rolesConPermisos,
      totalPermisos: allPermisos.rows.length,
      permisosPorModulo,
      todosLosPermisos: allPermisos.rows,
      usuariosConRoles: usuariosConRoles.rows,
      debugInfo: {
        totalRoles: adminRole.rows.length,
        totalPermisosSistema: allPermisos.rows.length,
        permisosPorModuloCount: Object.fromEntries(
          Object.entries(permisosPorModulo).map(([k, v]) => [k, (v as any[]).length])
        )
      }
    });

  } catch (err: any) {
    console.error('[admin/rbac/debug-permissions-public][GET] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}
