import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando permisos de roles...');

    // 1. Obtener todos los roles con conteo de permisos
    const rolesConPermisos = await sql`
      SELECT 
        r.id, r.nombre, r.descripcion, r.tenant_id,
        t.nombre as tenant_nombre,
        COUNT(rp.permiso_id) as total_permisos,
        STRING_AGG(p.clave, ', ' ORDER BY p.clave) as permisos_claves
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      LEFT JOIN permisos p ON rp.permiso_id = p.id
      GROUP BY r.id, r.nombre, r.descripcion, r.tenant_id, t.nombre
      ORDER BY t.nombre, r.nombre
    `;

    // 2. Obtener estadísticas por tenant
    const estadisticasPorTenant = await sql`
      SELECT 
        t.nombre as tenant_nombre,
        COUNT(r.id) as total_roles,
        COUNT(CASE WHEN rp.permiso_id IS NOT NULL THEN 1 END) as roles_con_permisos,
        AVG(permisos_count.total) as promedio_permisos_por_rol
      FROM tenants t
      LEFT JOIN roles r ON t.id = r.tenant_id
      LEFT JOIN (
        SELECT rol_id, COUNT(permiso_id) as total
        FROM roles_permisos
        GROUP BY rol_id
      ) permisos_count ON r.id = permisos_count.rol_id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      GROUP BY t.id, t.nombre
      ORDER BY t.nombre
    `;

    // 3. Verificar permisos específicos por módulo (extraer módulo de la clave)
    const permisosPorModulo = await sql`
      SELECT 
        SPLIT_PART(p.clave, '.', 1) as modulo,
        r.nombre as rol_nombre,
        t.nombre as tenant_nombre,
        COUNT(rp.permiso_id) as permisos_en_modulo
      FROM permisos p
      CROSS JOIN roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id AND p.id = rp.permiso_id
      GROUP BY SPLIT_PART(p.clave, '.', 1), r.nombre, t.nombre
      ORDER BY t.nombre, r.nombre, modulo
    `;

    // 4. Identificar roles con pocos permisos (potencial problema)
    const rolesConPocosPermisos = rolesConPermisos.rows.filter(r => r.total_permisos < 10);

    // 5. Verificar permisos de administración
    const permisosAdmin = await sql`
      SELECT 
        r.nombre as rol_nombre,
        t.nombre as tenant_nombre,
        COUNT(CASE WHEN p.clave LIKE '%.admin' OR p.clave LIKE '%.*' THEN 1 END) as permisos_admin,
        COUNT(rp.permiso_id) as total_permisos
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      LEFT JOIN permisos p ON rp.permiso_id = p.id
      GROUP BY r.id, r.nombre, t.nombre
      ORDER BY t.nombre, r.nombre
    `;

    return NextResponse.json({
      success: true,
      verificacion: {
        timestamp: new Date().toISOString(),
        rolesConPermisos: rolesConPermisos.rows,
        estadisticasPorTenant: estadisticasPorTenant.rows,
        permisosPorModulo: permisosPorModulo.rows,
        permisosAdmin: permisosAdmin.rows,
        alertas: {
          rolesConPocosPermisos: rolesConPocosPermisos.map(r => ({
            rol: r.nombre,
            tenant: r.tenant_nombre,
            permisos: r.total_permisos
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error verificando permisos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
