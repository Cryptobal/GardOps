import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const { tenant_id } = await request.json();
    
    if (!tenant_id) {
      return NextResponse.json({ 
        error: 'Se requiere tenant_id' 
      }, { status: 400 });
    }

    console.log(`🔧 CREANDO ROLES ESTÁNDAR PARA TENANT ${tenant_id}...`);

    // 1. Verificar que el tenant existe
    const tenant = await sql`
      SELECT id, nombre FROM tenants WHERE id = ${tenant_id}::uuid
    `;

    if (tenant.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Tenant no encontrado' 
      }, { status: 404 });
    }

    const tenantData = tenant.rows[0];
    console.log(`Tenant: ${tenantData.nombre} (${tenantData.id})`);

    // 2. Verificar si ya existen roles para este tenant
    const rolesExistentes = await sql`
      SELECT COUNT(*) as count FROM roles WHERE tenant_id = ${tenant_id}::uuid
    `;

    if (parseInt(rolesExistentes.rows[0].count) > 0) {
      return NextResponse.json({ 
        error: 'Este tenant ya tiene roles asignados',
        tenant: tenantData.nombre
      }, { status: 409 });
    }

    // 3. Crear roles estándar
    console.log('\n👑 Creando roles estándar...');
    
    const rolesEstándar = await sql`
      INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Super Admin', 'Administrador con acceso completo a todos los módulos del sistema', ${tenant_id}::uuid),
        (gen_random_uuid(), 'Tenant Admin', 'Administrador del tenant con gestión de usuarios y configuración', ${tenant_id}::uuid),
        (gen_random_uuid(), 'Supervisor', 'Supervisor con acceso a gestión de guardias, turnos y reportes', ${tenant_id}::uuid),
        (gen_random_uuid(), 'Operador', 'Operador con acceso a pautas diarias y turnos', ${tenant_id}::uuid),
        (gen_random_uuid(), 'Consulta', 'Usuario con acceso de solo lectura a reportes y consultas', ${tenant_id}::uuid)
      RETURNING id, nombre, descripcion
    `;

    console.log('Roles estándar creados:', rolesEstándar.rows);

    // 4. Obtener permisos disponibles
    console.log('\n🔑 Obteniendo permisos disponibles...');
    const permisos = await sql`SELECT id, clave as nombre FROM permisos ORDER BY clave`;
    console.log(`Total permisos encontrados: ${permisos.rows.length}`);

    // 5. Asignar permisos a cada rol
    console.log('\n🔐 Asignando permisos a roles...');
    
    const superAdmin = rolesEstándar.rows.find(r => r.nombre === 'Super Admin');
    const tenantAdmin = rolesEstándar.rows.find(r => r.nombre === 'Tenant Admin');
    const supervisor = rolesEstándar.rows.find(r => r.nombre === 'Supervisor');
    const operador = rolesEstándar.rows.find(r => r.nombre === 'Operador');
    const consulta = rolesEstándar.rows.find(r => r.nombre === 'Consulta');

    // Super Admin: TODOS los permisos
    if (superAdmin) {
      await sql`
        INSERT INTO roles_permisos (rol_id, permiso_id)
        SELECT ${superAdmin.id}::uuid, id FROM permisos
        ON CONFLICT (rol_id, permiso_id) DO NOTHING
      `;
      console.log('✅ Permisos asignados a Super Admin');
    }

    // Tenant Admin: permisos de administración
    if (tenantAdmin) {
      const permisosTenantAdmin = permisos.rows.filter(p => 
        ['home.view', 'clientes.*', 'instalaciones.*', 'guardias.*', 
         'pauta_mensual.*', 'pauta_diaria.*', 'turnos_extras.*',
         'payroll.view', 'payroll.create', 'payroll.edit',
         'config.view', 'usuarios.*', 'rbac.roles.read', 'rbac.permisos.read',
         'documentos.view', 'documentos.create', 'documentos.edit',
         'alertas.view', 'asignaciones.view', 'asignaciones.create', 'asignaciones.edit'].includes(p.nombre)
      );
      
      for (const permiso of permisosTenantAdmin) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${tenantAdmin.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Tenant Admin');
    }

    // Supervisor: permisos de supervisión
    if (supervisor) {
      const permisosSupervisor = permisos.rows.filter(p => 
        ['home.view', 'clientes.view', 'instalaciones.view', 'guardias.*',
         'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit',
         'pauta_diaria.*', 'turnos_extras.*', 'payroll.view',
         'documentos.view', 'alertas.view', 'asignaciones.*'].includes(p.nombre)
      );
      
      for (const permiso of permisosSupervisor) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${supervisor.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Supervisor');
    }

    // Operador: permisos operativos
    if (operador) {
      const permisosOperador = permisos.rows.filter(p => 
        ['home.view', 'clientes.view', 'instalaciones.view', 'guardias.view',
         'pauta_mensual.view', 'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit',
         'turnos_extras.view', 'turnos_extras.create', 'documentos.view'].includes(p.nombre)
      );
      
      for (const permiso of permisosOperador) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${operador.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Operador');
    }

    // Consulta: permisos de solo lectura
    if (consulta) {
      const permisosConsulta = permisos.rows.filter(p => 
        ['home.view', 'clientes.view', 'instalaciones.view', 'guardias.view',
         'pauta_mensual.view', 'pauta_diaria.view', 'turnos_extras.view',
         'payroll.view', 'documentos.view', 'alertas.view'].includes(p.nombre)
      );
      
      for (const permiso of permisosConsulta) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${consulta.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Consulta');
    }

    // 6. Verificar resultado final
    const rolesFinales = await sql`
      SELECT r.nombre, r.descripcion, COUNT(rp.permiso_id) as permisos_asignados
      FROM roles r
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE r.tenant_id = ${tenant_id}::uuid
      GROUP BY r.id, r.nombre, r.descripcion
      ORDER BY r.nombre
    `;

    console.log('\n📊 Roles finales creados:');
    rolesFinales.rows.forEach(rol => {
      console.log(`   ${rol.nombre}: ${rol.permisos_asignados} permisos`);
    });

    return NextResponse.json({
      success: true,
      message: 'Roles estándar creados exitosamente para el tenant',
      roles: rolesFinales.rows,
      tenant: tenantData.nombre
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      error: 'Error al crear roles estándar',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
