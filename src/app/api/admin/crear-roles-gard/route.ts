import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 CREANDO ROLES PARA GARD...');

    // 1. Obtener tenant Gard
    const gardTenant = await sql`
      SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
    `;

    if (gardTenant.rows.length === 0) {
      return NextResponse.json({ error: 'No se encontró el tenant Gard' }, { status: 400 });
    }

    const gardTenantId = gardTenant.rows[0].id;
    console.log('Gard tenant_id:', gardTenantId);

    // 2. Eliminar roles existentes de Gard
    console.log('\n🗑️ Eliminando roles existentes de Gard...');
    
    await sql`
      DELETE FROM roles_permisos 
      WHERE rol_id IN (
        SELECT id FROM roles 
        WHERE tenant_id = ${gardTenantId}::uuid
        AND nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
      )
    `;

    await sql`
      DELETE FROM usuarios_roles 
      WHERE rol_id IN (
        SELECT id FROM roles 
        WHERE tenant_id = ${gardTenantId}::uuid
        AND nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
      )
    `;

    await sql`
      DELETE FROM roles 
      WHERE tenant_id = ${gardTenantId}::uuid
      AND nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
    `;

    console.log('✅ Roles eliminados de Gard');

    // 3. Crear roles para Gard
    console.log('\n👑 Creando roles para Gard...');
    
    const gardRoles = await sql`
      INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Super Admin', 'Administrador con acceso completo a todos los módulos', ${gardTenantId}::uuid),
        (gen_random_uuid(), 'Tenant Admin', 'Administrador del tenant con acceso a gestión de usuarios y configuración', ${gardTenantId}::uuid),
        (gen_random_uuid(), 'Supervisor', 'Supervisor con acceso a gestión de guardias y reportes', ${gardTenantId}::uuid),
        (gen_random_uuid(), 'Perfil Básico', 'Usuario básico con acceso limitado a consultas', ${gardTenantId}::uuid)
      ON CONFLICT (nombre) DO UPDATE SET 
        descripcion = EXCLUDED.descripcion,
        tenant_id = EXCLUDED.tenant_id
      RETURNING id, nombre
    `;

    console.log('Roles de Gard creados:', gardRoles.rows);

    // 4. Obtener todos los permisos
    console.log('\n🔑 Obteniendo permisos...');
    const permisos = await sql`SELECT id, clave as nombre FROM permisos ORDER BY clave`;
    console.log(`Total permisos encontrados: ${permisos.rows.length}`);

    // 5. Asignar permisos a roles de Gard
    console.log('\n🔐 Asignando permisos a roles de Gard...');
    
    const gardSuperAdmin = gardRoles.rows.find(r => r.nombre === 'Super Admin');
    const gardTenantAdmin = gardRoles.rows.find(r => r.nombre === 'Tenant Admin');
    const gardSupervisor = gardRoles.rows.find(r => r.nombre === 'Supervisor');
    const gardPerfilBasico = gardRoles.rows.find(r => r.nombre === 'Perfil Básico');

    if (gardSuperAdmin) {
      // Super Admin: TODOS los permisos
      await sql`
        INSERT INTO roles_permisos (rol_id, permiso_id)
        SELECT ${gardSuperAdmin.id}::uuid, id FROM permisos
        ON CONFLICT (rol_id, permiso_id) DO NOTHING
      `;
      console.log('✅ Permisos asignados a Super Admin de Gard');
    }

    if (gardTenantAdmin) {
      // Tenant Admin: permisos básicos
      const permisosTenantAdmin = permisos.rows.filter(p => 
        ['home.view', 'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
         'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
         'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
         'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit', 'pauta_mensual.delete',
         'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit', 'pauta_diaria.delete',
         'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
         'turnos_extras.view', 'turnos_extras.create', 'turnos_extras.edit', 'turnos_extras.delete',
         'config.view', 'usuarios.view', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
         'rbac.roles.read', 'rbac.permisos.read'].includes(p.nombre)
      );
      
      for (const permiso of permisosTenantAdmin) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${gardTenantAdmin.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Tenant Admin de Gard');
    }

    if (gardSupervisor) {
      // Supervisor: permisos de supervisión
      const permisosSupervisor = permisos.rows.filter(p => 
        ['home.view', 'clientes.view', 'instalaciones.view', 'guardias.view', 'guardias.create', 'guardias.edit',
         'pauta_mensual.view', 'pauta_diaria.view', 'payroll.view', 'turnos_extras.view'].includes(p.nombre)
      );
      
      for (const permiso of permisosSupervisor) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${gardSupervisor.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Supervisor de Gard');
    }

    if (gardPerfilBasico) {
      // Perfil Básico: permisos básicos
      const permisosBasico = permisos.rows.filter(p => 
        ['home.view', 'clientes.view', 'instalaciones.view', 'guardias.view'].includes(p.nombre)
      );
      
      for (const permiso of permisosBasico) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${gardPerfilBasico.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Perfil Básico de Gard');
    }

    // 6. Asignar rol Super Admin a Carlos.Irigoyen@gard.cl
    console.log('\n👤 Asignando rol Super Admin a Carlos.Irigoyen@gard.cl...');
    
    const carlos = await sql`
      SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl' LIMIT 1
    `;

    if (carlos.rows.length > 0 && gardSuperAdmin) {
      // Eliminar roles anteriores
      await sql`
        DELETE FROM usuarios_roles WHERE usuario_id = ${carlos.rows[0].id}::uuid
      `;
      
      // Asignar nuevo rol
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (${carlos.rows[0].id}::uuid, ${gardSuperAdmin.id}::uuid)
      `;
      
      console.log('✅ Rol Super Admin asignado a Carlos.Irigoyen@gard.cl');
    } else {
      console.log('❌ No se pudo asignar rol a Carlos.Irigoyen@gard.cl');
    }

    // 7. Verificar resultado final
    console.log('\n📊 VERIFICACIÓN FINAL:');
    
    const rolesFinales = await sql`
      SELECT t.nombre as tenant, COUNT(r.id) as total_roles, STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
      FROM tenants t
      LEFT JOIN roles r ON t.id = r.tenant_id
      WHERE r.nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
      GROUP BY t.id, t.nombre
      ORDER BY t.nombre
    `;
    
    console.log('Roles por tenant:', rolesFinales.rows);

    const carlosRoles = await sql`
      SELECT u.email, r.nombre as rol, t.nombre as tenant
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN tenants t ON r.tenant_id = t.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
    `;
    
    console.log('Roles de Carlos:', carlosRoles.rows);

    console.log('\n🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!');

    return NextResponse.json({
      success: true,
      message: 'Roles creados exitosamente para Gard',
      rolesPorTenant: rolesFinales.rows,
      carlosRoles: carlosRoles.rows
    });

  } catch (error) {
    console.error('❌ Error durante la ejecución:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
