import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creando roles estándar para Tenant Demo...');

    // 1. Obtener el tenant Demo
    const tenantResult = await sql`
      SELECT id, nombre 
      FROM tenants 
      WHERE nombre = 'Tenant Demo'
    `;
    
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant Demo no encontrado' }, { status: 404 });
    }
    
    const tenant = tenantResult.rows[0];
    console.log('✅ Tenant encontrado:', tenant);

    // 2. Obtener todos los permisos disponibles
    const permisosResult = await sql`
      SELECT id, clave, descripcion 
      FROM permisos 
      ORDER BY clave
    `;
    
    const permisos = permisosResult.rows;
    console.log(`✅ ${permisos.length} permisos encontrados`);

    // 3. Definir los roles estándar con sus permisos
    const rolesEstandar = [
      {
        nombre: 'Super Admin',
        descripcion: 'Administrador con acceso completo a todos los módulos',
        permisos: permisos.map(p => p.clave) // Todos los permisos
      },
      {
        nombre: 'Tenant Admin',
        descripcion: 'Administrador del tenant con acceso a la mayoría de módulos',
        permisos: [
          'home.view', 'home.edit',
          'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
          'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
          'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
          'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit', 'pauta_mensual.delete',
          'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit', 'pauta_diaria.delete',
          'turnos_extras.view', 'turnos_extras.create', 'turnos_extras.edit', 'turnos_extras.delete',
          'sueldos.view', 'sueldos.create', 'sueldos.edit', 'sueldos.delete',
          'ppc.view', 'ppc.create', 'ppc.edit', 'ppc.delete',
          'documentos.view', 'documentos.create', 'documentos.edit', 'documentos.delete',
          'alertas.view', 'alertas.create', 'alertas.edit', 'alertas.delete',
          'kpi.view', 'kpi.edit',
          'asignaciones.view', 'asignaciones.create', 'asignaciones.edit', 'asignaciones.delete',
          'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
          'config.manage', 'rbac.permisos.read', 'rbac.roles.read'
        ]
      },
      {
        nombre: 'Supervisor',
        descripcion: 'Supervisor con acceso a ver y editar datos operativos',
        permisos: [
          'home.view',
          'clientes.view', 'clientes.edit',
          'instalaciones.view', 'instalaciones.edit',
          'guardias.view', 'guardias.edit',
          'pauta_mensual.view', 'pauta_mensual.edit',
          'pauta_diaria.view', 'pauta_diaria.edit',
          'turnos_extras.view', 'turnos_extras.edit',
          'sueldos.view',
          'ppc.view', 'ppc.edit',
          'documentos.view', 'documentos.edit',
          'alertas.view',
          'kpi.view',
          'asignaciones.view', 'asignaciones.edit',
          'payroll.view'
        ]
      },
      {
        nombre: 'Perfil Básico',
        descripcion: 'Usuario básico con acceso limitado a consultas',
        permisos: [
          'home.view',
          'clientes.view',
          'instalaciones.view',
          'guardias.view',
          'pauta_mensual.view',
          'pauta_diaria.view',
          'turnos_extras.view',
          'sueldos.view',
          'ppc.view',
          'documentos.view',
          'alertas.view',
          'kpi.view',
          'asignaciones.view',
          'payroll.view'
        ]
      }
    ];

    // 4. Crear los roles y asignar permisos
    for (const rolConfig of rolesEstandar) {
      console.log(`🔄 Creando rol: ${rolConfig.nombre}`);
      
      // Crear el rol
      const rolResult = await sql`
        INSERT INTO roles (nombre, descripcion, tenant_id)
        VALUES (${rolConfig.nombre}, ${rolConfig.descripcion}, ${tenant.id})
        ON CONFLICT (nombre) DO UPDATE SET 
          descripcion = EXCLUDED.descripcion,
          tenant_id = EXCLUDED.tenant_id
        RETURNING id
      `;
      
      const rolId = rolResult.rows[0].id;
      
      // Asignar permisos al rol
      for (const permisoClave of rolConfig.permisos) {
        const permiso = permisos.find(p => p.clave === permisoClave);
        if (permiso) {
          await sql`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            VALUES (${rolId}, ${permiso.id})
            ON CONFLICT (rol_id, permiso_id) DO NOTHING
          `;
        }
      }
      
      console.log(`✅ Rol ${rolConfig.nombre} creado con ${rolConfig.permisos.length} permisos`);
    }

    // 5. Asignar el rol Tenant Admin a admin@demo.com
    const adminDemoResult = await sql`
      SELECT id FROM usuarios WHERE email = 'admin@demo.com'
    `;
    
    if (adminDemoResult.rows.length > 0) {
      const adminDemoId = adminDemoResult.rows[0].id;
      
      const tenantAdminResult = await sql`
        SELECT id FROM roles WHERE nombre = 'Tenant Admin' AND tenant_id = ${tenant.id}
      `;
      
      if (tenantAdminResult.rows.length > 0) {
        const tenantAdminId = tenantAdminResult.rows[0].id;
        
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${adminDemoId}, ${tenantAdminId})
          ON CONFLICT (usuario_id, rol_id) DO NOTHING
        `;
        
        console.log('✅ Rol Tenant Admin asignado a admin@demo.com');
      }
    }

    console.log('🎯 Roles estándar creados exitosamente para Tenant Demo');

    return NextResponse.json({
      success: true,
      message: 'Roles estándar creados exitosamente para Tenant Demo',
      tenant: tenant,
      rolesCreados: rolesEstandar.length
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
