import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 CORRIGIENDO PERMISOS DE TENANT ADMIN...');

    // 1. Obtener todos los tenants
    const tenants = await sql`
      SELECT id, nombre FROM tenants ORDER BY nombre
    `;

    for (const tenant of tenants.rows) {
      console.log(`\n📋 Procesando tenant: ${tenant.nombre}`);

      // 2. Buscar el rol Tenant Admin del tenant
      const tenantAdminRole = await sql`
        SELECT id, nombre, descripcion
        FROM roles
        WHERE tenant_id = ${tenant.id}::uuid
        AND nombre = 'Tenant Admin'
      `;

      if (tenantAdminRole.rows.length === 0) {
        console.log(`   ⚠️ No se encontró rol Tenant Admin para ${tenant.nombre}`);
        continue;
      }

      const roleData = tenantAdminRole.rows[0];
      console.log(`   👑 Rol Tenant Admin encontrado: ${roleData.nombre} (${roleData.id})`);

      // 3. Obtener todos los permisos disponibles
      const permisos = await sql`SELECT id, clave as nombre FROM permisos ORDER BY clave`;
      console.log(`   🔑 Total permisos disponibles: ${permisos.rows.length}`);

      // 4. Eliminar permisos actuales del Tenant Admin
      await sql`
        DELETE FROM roles_permisos 
        WHERE rol_id = ${roleData.id}::uuid
      `;
      console.log(`   🗑️ Permisos actuales eliminados`);

      // 5. Asignar TODOS los permisos al Tenant Admin (excepto administración de tenants)
      const permisosParaTenantAdmin = permisos.rows.filter(p => 
        // Excluir permisos de administración de tenants (solo para Super Admin)
        !p.nombre.includes('rbac.tenants') && 
        !p.nombre.includes('rbac.platform_admin')
      );

      console.log(`   📊 Permisos a asignar: ${permisosParaTenantAdmin.length} (excluyendo administración de tenants)`);

      for (const permiso of permisosParaTenantAdmin) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${roleData.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }

      console.log(`   ✅ Permisos asignados a Tenant Admin de ${tenant.nombre}`);
    }

    // 6. Verificar resultado final
    console.log('\n📊 Verificando resultados...');
    for (const tenant of tenants.rows) {
      const rolesFinales = await sql`
        SELECT r.nombre, r.descripcion, COUNT(rp.permiso_id) as permisos_asignados
        FROM roles r
        LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
        WHERE r.tenant_id = ${tenant.id}::uuid
        AND r.nombre = 'Tenant Admin'
        GROUP BY r.id, r.nombre, r.descripcion
      `;

      if (rolesFinales.rows.length > 0) {
        const rol = rolesFinales.rows[0];
        console.log(`   ${tenant.nombre} - Tenant Admin: ${rol.permisos_asignados} permisos`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Permisos de Tenant Admin corregidos exitosamente',
      tenants_procesados: tenants.rows.map(t => t.nombre)
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      error: 'Error al corregir permisos de Tenant Admin',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
