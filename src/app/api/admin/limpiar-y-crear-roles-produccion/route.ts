import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando creación de roles estándar para producción...');

    // 1. Obtener el tenant Gard
    const gardTenant = await sql`
      SELECT id, nombre FROM tenants WHERE nombre = 'Gard' LIMIT 1
    `;

    if (gardTenant.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant Gard no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ Tenant encontrado: ${gardTenant.rows[0].nombre}`);

    // 2. Eliminar roles existentes del tenant Gard
    console.log('🗑️ Eliminando roles existentes...');
    await sql`
      DELETE FROM roles WHERE tenant_id = ${gardTenant.rows[0].id}::uuid
    `;

    // 3. Crear roles estándar
    console.log('📝 Creando roles estándar...');
    const rolesCreados = await sql`
      INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES
        (gen_random_uuid(), 'Super Admin', 'Administrador con acceso completo a todos los módulos del sistema', ${gardTenant.rows[0].id}::uuid),
        (gen_random_uuid(), 'Tenant Admin', 'Administrador del tenant con gestión de usuarios y configuración', ${gardTenant.rows[0].id}::uuid),
        (gen_random_uuid(), 'Supervisor', 'Supervisor con acceso a gestión de guardias, turnos y reportes', ${gardTenant.rows[0].id}::uuid),
        (gen_random_uuid(), 'Operador', 'Operador con acceso a pautas diarias y turnos', ${gardTenant.rows[0].id}::uuid),
        (gen_random_uuid(), 'Consulta', 'Usuario con acceso de solo lectura a reportes y consultas', ${gardTenant.rows[0].id}::uuid)
      RETURNING id, nombre, descripcion
    `;

    console.log(`✅ Roles creados: ${rolesCreados.rows.length}`);

    // 4. Obtener todos los permisos disponibles
    const permisos = await sql`
      SELECT id, clave, descripcion FROM permisos ORDER BY clave
    `;

    console.log(`📋 Permisos disponibles: ${permisos.rows.length}`);

    // 5. Asignar permisos a cada rol
    const rolesConPermisos = [];

    for (const rol of rolesCreados.rows) {
      let permisosAsignados = [];

      switch (rol.nombre) {
        case 'Super Admin':
          // Todos los permisos
          permisosAsignados = permisos.rows.map(p => p.id);
          break;

        case 'Tenant Admin':
          // Todos excepto gestión multi-tenant y platform admin
          permisosAsignados = permisos.rows
            .filter(p => !p.clave.startsWith('rbac.tenants.') && p.clave !== 'rbac.platform_admin')
            .map(p => p.id);
          break;

        case 'Supervisor':
          // Permisos de gestión de guardias, turnos, reportes
          permisosAsignados = permisos.rows
            .filter(p => 
              p.clave.includes('guardias') ||
              p.clave.includes('turnos') ||
              p.clave.includes('reportes') ||
              p.clave.includes('pauta') ||
              p.clave.includes('clientes') ||
              p.clave.includes('instalaciones')
            )
            .map(p => p.id);
          break;

        case 'Operador':
          // Permisos de pautas diarias y turnos
          permisosAsignados = permisos.rows
            .filter(p => 
              p.clave.includes('pauta') ||
              p.clave.includes('turnos') ||
              p.clave.includes('guardias.view')
            )
            .map(p => p.id);
          break;

        case 'Consulta':
          // Solo permisos de lectura
          permisosAsignados = permisos.rows
            .filter(p => p.clave.endsWith('.view'))
            .map(p => p.id);
          break;
      }

      // Asignar permisos al rol
      if (permisosAsignados.length > 0) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id)
          SELECT ${rol.id}::uuid, p.id::uuid
          FROM unnest(${permisosAsignados}::uuid[]) AS p(id)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }

      rolesConPermisos.push({
        ...rol,
        permisosCount: permisosAsignados.length
      });
    }

    console.log('✅ Permisos asignados exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Roles estándar creados exitosamente',
      tenant: gardTenant.rows[0],
      roles: rolesConPermisos,
      totalPermisos: permisos.rows.length
    });

  } catch (error) {
    console.error('❌ Error creando roles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
