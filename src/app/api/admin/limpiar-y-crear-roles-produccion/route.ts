import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 INICIANDO LIMPIEZA Y CREACIÓN DE ROLES PARA PRODUCCIÓN...');

    // 1. Verificar tenants existentes
    console.log('\n📋 Verificando tenants existentes...');
    const tenants = await sql`
      SELECT id, nombre
      FROM tenants
      ORDER BY nombre
    `;
    console.log('Tenants encontrados:', tenants.rows);

    // 2. Obtener ID del tenant Gard
    const gardTenant = tenants.rows.find(t => t.nombre === 'Gard');
    
    if (!gardTenant) {
      return NextResponse.json({ 
        error: 'No se encontró el tenant Gard',
        tenants: tenants.rows 
      }, { status: 400 });
    }

    console.log('Gard tenant_id:', gardTenant.id);

    // 3. ELIMINAR roles de prueba y existentes
    console.log('\n🗑️ Eliminando roles de prueba y existentes...');
    
    // Eliminar permisos de roles
    await sql`
      DELETE FROM roles_permisos 
      WHERE rol_id IN (
        SELECT id FROM roles 
        WHERE tenant_id = ${gardTenant.id}::uuid
      )
    `;

    // Eliminar asignaciones de usuarios a roles
    await sql`
      DELETE FROM usuarios_roles 
      WHERE rol_id IN (
        SELECT id FROM roles 
        WHERE tenant_id = ${gardTenant.id}::uuid
      )
    `;

    // Eliminar roles
    await sql`
      DELETE FROM roles 
      WHERE tenant_id = ${gardTenant.id}::uuid
    `;

    console.log('✅ Roles eliminados');

    // 4. CREAR roles estándar para producción
    console.log('\n👑 Creando roles estándar para producción...');
    
    const rolesEstándar = await sql`
      INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Super Admin', 'Administrador con acceso completo a todos los módulos del sistema', ${gardTenant.id}::uuid),
        (gen_random_uuid(), 'Tenant Admin', 'Administrador del tenant con gestión de usuarios y configuración', ${gardTenant.id}::uuid),
        (gen_random_uuid(), 'Supervisor', 'Supervisor con acceso a gestión de guardias, turnos y reportes', ${gardTenant.id}::uuid),
        (gen_random_uuid(), 'Operador', 'Operador con acceso a pautas diarias y turnos', ${gardTenant.id}::uuid),
        (gen_random_uuid(), 'Consulta', 'Usuario con acceso de solo lectura a reportes y consultas', ${gardTenant.id}::uuid)
      RETURNING id, nombre, descripcion
    `;

    console.log('Roles estándar creados:', rolesEstándar.rows);

    // 5. Obtener todos los permisos disponibles
    console.log('\n🔑 Obteniendo permisos disponibles...');
    const permisos = await sql`SELECT id, clave as nombre FROM permisos ORDER BY clave`;
    console.log(`Total permisos encontrados: ${permisos.rows.length}`);

    // 6. Asignar permisos a cada rol
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

    // 7. Verificar resultado final
    const rolesFinales = await sql`
      SELECT r.nombre, r.descripcion, COUNT(rp.permiso_id) as permisos_asignados
      FROM roles r
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE r.tenant_id = ${gardTenant.id}::uuid
      GROUP BY r.id, r.nombre, r.descripcion
      ORDER BY r.nombre
    `;

    console.log('\n📊 Roles finales creados:');
    rolesFinales.rows.forEach(rol => {
      console.log(`   ${rol.nombre}: ${rol.permisos_asignados} permisos`);
    });

    return NextResponse.json({
      success: true,
      message: 'Roles de producción creados exitosamente',
      roles: rolesFinales.rows,
      tenant: gardTenant.nombre
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      error: 'Error al crear roles de producción',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
