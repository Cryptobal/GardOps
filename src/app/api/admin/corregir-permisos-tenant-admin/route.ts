import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Corrigiendo permisos de Tenant Admin...');

    // 1. Obtener todos los tenants
    const tenants = await sql`
      SELECT id, nombre FROM tenants ORDER BY nombre
    `;

    const resultados = [];

    for (const tenant of tenants.rows) {
      console.log(`📝 Procesando tenant: ${tenant.nombre}`);

      // 2. Buscar rol Tenant Admin en este tenant
      const tenantAdminRole = await sql`
        SELECT id, nombre FROM roles 
        WHERE nombre = 'Tenant Admin' AND tenant_id = ${tenant.id}::uuid
        LIMIT 1
      `;

      if (tenantAdminRole.rows.length === 0) {
        console.log(`⚠️ No se encontró rol Tenant Admin en ${tenant.nombre}`);
        resultados.push({
          tenant: tenant.nombre,
          status: 'no_role_found',
          message: 'Rol Tenant Admin no encontrado'
        });
        continue;
      }

      // 3. Obtener todos los permisos excepto los de gestión multi-tenant
      const permisosDisponibles = await sql`
        SELECT id, clave, descripcion 
        FROM permisos 
        WHERE clave NOT LIKE 'rbac.tenants.%' 
        AND clave != 'rbac.platform_admin'
        ORDER BY clave
      `;

      // 4. Eliminar permisos existentes del Tenant Admin
      await sql`
        DELETE FROM roles_permisos 
        WHERE rol_id = ${tenantAdminRole.rows[0].id}::uuid
      `;

      // 5. Asignar todos los permisos disponibles al Tenant Admin
      if (permisosDisponibles.rows.length > 0) {
        const permisosIds = permisosDisponibles.rows.map(p => p.id);
        
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id)
          SELECT ${tenantAdminRole.rows[0].id}::uuid, p.id::uuid
          FROM unnest(${permisosIds}::uuid[]) AS p(id)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }

      // 6. Verificar permisos asignados
      const permisosAsignados = await sql`
        SELECT COUNT(*) as total
        FROM roles_permisos 
        WHERE rol_id = ${tenantAdminRole.rows[0].id}::uuid
      `;

      console.log(`✅ Tenant Admin en ${tenant.nombre}: ${permisosAsignados.rows[0].total} permisos asignados`);

      resultados.push({
        tenant: tenant.nombre,
        status: 'success',
        roleId: tenantAdminRole.rows[0].id,
        permisosAsignados: permisosAsignados.rows[0].total,
        totalPermisosDisponibles: permisosDisponibles.rows.length
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Permisos de Tenant Admin corregidos exitosamente',
      resultados,
      totalTenants: tenants.rows.length
    });

  } catch (error) {
    console.error('❌ Error corrigiendo permisos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
