import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 INICIANDO AUDITORÍA RBAC PARA PRODUCCIÓN...');

    const auditoria = {
      timestamp: new Date().toISOString(),
      resumen: {},
      tenants: [],
      roles_por_tenant: {},
      permisos_totales: 0,
      usuarios_con_roles: [],
      inconsistencias: [],
      recomendaciones: []
    };

    // 1. Verificar tenants
    console.log('\n📋 Verificando tenants...');
    const tenants = await sql`
      SELECT id, nombre, rut, activo, created_at
      FROM tenants
      ORDER BY nombre
    `;
    auditoria.tenants = tenants.rows;
    console.log(`Tenants encontrados: ${tenants.rows.length}`);

    // 2. Contar permisos totales
    console.log('\n🔑 Contando permisos...');
    const permisos = await sql`SELECT COUNT(*) as total FROM permisos`;
    auditoria.permisos_totales = parseInt(permisos.rows[0].total);
    console.log(`Total permisos: ${auditoria.permisos_totales}`);

    // 3. Verificar roles por tenant
    console.log('\n👑 Verificando roles por tenant...');
    for (const tenant of tenants.rows) {
      const roles = await sql`
        SELECT r.id, r.nombre, r.descripcion, COUNT(rp.permiso_id) as permisos_asignados
        FROM roles r
        LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
        WHERE r.tenant_id = ${tenant.id}::uuid
        GROUP BY r.id, r.nombre, r.descripcion
        ORDER BY r.nombre
      `;
      
      auditoria.roles_por_tenant[tenant.nombre] = roles.rows;
      console.log(`   ${tenant.nombre}: ${roles.rows.length} roles`);
    }

    // 4. Verificar usuarios con roles
    console.log('\n👤 Verificando usuarios con roles...');
    const usuariosConRoles = await sql`
      SELECT 
        u.id, u.email, u.nombre, u.activo,
        t.nombre as tenant_nombre,
        COUNT(ur.rol_id) as roles_asignados,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as nombres_roles
      FROM usuarios u
      JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles r ON ur.rol_id = r.id
      GROUP BY u.id, u.email, u.nombre, u.activo, t.nombre
      HAVING COUNT(ur.rol_id) > 0
      ORDER BY t.nombre, u.nombre
    `;
    auditoria.usuarios_con_roles = usuariosConRoles.rows;
    console.log(`Usuarios con roles: ${usuariosConRoles.rows.length}`);

    // 5. Verificar inconsistencias
    console.log('\n⚠️ Verificando inconsistencias...');
    
    // Usuarios sin roles
    const usuariosSinRoles = await sql`
      SELECT u.id, u.email, u.nombre, t.nombre as tenant_nombre
      FROM usuarios u
      JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      WHERE ur.usuario_id IS NULL
      ORDER BY t.nombre, u.nombre
    `;
    
    if (usuariosSinRoles.rows.length > 0) {
      auditoria.inconsistencias.push({
        tipo: 'usuarios_sin_roles',
        descripcion: 'Usuarios sin roles asignados',
        cantidad: usuariosSinRoles.rows.length,
        detalles: usuariosSinRoles.rows
      });
    }

    // Roles sin permisos
    const rolesSinPermisos = await sql`
      SELECT r.id, r.nombre, r.descripcion, t.nombre as tenant_nombre
      FROM roles r
      JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE rp.rol_id IS NULL
      ORDER BY t.nombre, r.nombre
    `;
    
    if (rolesSinPermisos.rows.length > 0) {
      auditoria.inconsistencias.push({
        tipo: 'roles_sin_permisos',
        descripcion: 'Roles sin permisos asignados',
        cantidad: rolesSinPermisos.rows.length,
        detalles: rolesSinPermisos.rows
      });
    }

    // Roles sin usuarios
    const rolesSinUsuarios = await sql`
      SELECT r.id, r.nombre, r.descripcion, t.nombre as tenant_nombre
      FROM roles r
      JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON r.id = ur.rol_id
      WHERE ur.rol_id IS NULL
      ORDER BY t.nombre, r.nombre
    `;
    
    if (rolesSinUsuarios.rows.length > 0) {
      auditoria.inconsistencias.push({
        tipo: 'roles_sin_usuarios',
        descripcion: 'Roles sin usuarios asignados',
        cantidad: rolesSinUsuarios.rows.length,
        detalles: rolesSinUsuarios.rows
      });
    }

    // 6. Generar recomendaciones
    console.log('\n💡 Generando recomendaciones...');
    
    // Verificar si cada tenant tiene roles estándar
    for (const tenant of tenants.rows) {
      const rolesTenant = auditoria.roles_por_tenant[tenant.nombre] || [];
      const rolesEstandar = ['Super Admin', 'Tenant Admin', 'Supervisor', 'Operador', 'Consulta'];
      const rolesFaltantes = rolesEstandar.filter(rol => 
        !rolesTenant.some(r => r.nombre === rol)
      );
      
      if (rolesFaltantes.length > 0) {
        auditoria.recomendaciones.push({
          tenant: tenant.nombre,
          tipo: 'roles_faltantes',
          descripcion: `Faltan roles estándar: ${rolesFaltantes.join(', ')}`,
          accion: 'Crear roles estándar para el tenant'
        });
      }
    }

    // Verificar usuarios activos sin roles
    const usuariosActivosSinRoles = usuariosSinRoles.rows.filter(u => u.activo);
    if (usuariosActivosSinRoles.length > 0) {
      auditoria.recomendaciones.push({
        tipo: 'usuarios_activos_sin_roles',
        descripcion: `${usuariosActivosSinRoles.length} usuarios activos sin roles`,
        accion: 'Asignar roles a usuarios activos'
      });
    }

    // 7. Generar resumen
    auditoria.resumen = {
      total_tenants: tenants.rows.length,
      total_permisos: auditoria.permisos_totales,
      total_roles: Object.values(auditoria.roles_por_tenant).reduce((acc: number, roles: any) => acc + roles.length, 0),
      total_usuarios_con_roles: auditoria.usuarios_con_roles.length,
      total_inconsistencias: auditoria.inconsistencias.length,
      total_recomendaciones: auditoria.recomendaciones.length
    };

    console.log('\n📊 Resumen de auditoría:');
    console.log(`   Tenants: ${auditoria.resumen.total_tenants}`);
    console.log(`   Permisos: ${auditoria.resumen.total_permisos}`);
    console.log(`   Roles: ${auditoria.resumen.total_roles}`);
    console.log(`   Usuarios con roles: ${auditoria.resumen.total_usuarios_con_roles}`);
    console.log(`   Inconsistencias: ${auditoria.resumen.total_inconsistencias}`);
    console.log(`   Recomendaciones: ${auditoria.resumen.total_recomendaciones}`);

    return NextResponse.json({
      success: true,
      auditoria
    });

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    return NextResponse.json({
      error: 'Error al realizar auditoría RBAC',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
