import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando auditoría RBAC completa...');

    // 1. Obtener todos los tenants
    const tenants = await sql`
      SELECT id, nombre, created_at FROM tenants ORDER BY nombre
    `;

    // 2. Obtener todos los roles por tenant
    const roles = await sql`
      SELECT 
        r.id, r.nombre, r.descripcion, r.tenant_id,
        t.nombre as tenant_nombre,
        COUNT(rp.permiso_id) as permisos_count
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      GROUP BY r.id, r.nombre, r.descripcion, r.tenant_id, t.nombre
      ORDER BY t.nombre, r.nombre
    `;

    // 3. Obtener todos los permisos
    const permisos = await sql`
      SELECT id, clave, descripcion
      FROM permisos 
      ORDER BY clave
    `;

    // 4. Obtener usuarios con sus roles
    const usuarios = await sql`
      SELECT 
        u.id, u.email, u.nombre, u.activo, u.tenant_id,
        t.nombre as tenant_nombre,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_asignados,
        COUNT(r.id) as roles_count
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles r ON ur.rol_id = r.id
      GROUP BY u.id, u.email, u.nombre, u.activo, u.tenant_id, t.nombre
      ORDER BY t.nombre, u.email
    `;

    // 5. Identificar inconsistencias
    const inconsistencias = [];

    // Usuarios sin roles
    const usuariosSinRoles = usuarios.rows.filter(u => !u.roles_asignados);
    if (usuariosSinRoles.length > 0) {
      inconsistencias.push({
        tipo: 'usuarios_sin_roles',
        descripcion: 'Usuarios sin roles asignados',
        items: usuariosSinRoles.map(u => ({ email: u.email, nombre: u.nombre }))
      });
    }

    // Roles sin permisos
    const rolesSinPermisos = roles.rows.filter(r => r.permisos_count === 0);
    if (rolesSinPermisos.length > 0) {
      inconsistencias.push({
        tipo: 'roles_sin_permisos',
        descripcion: 'Roles sin permisos asignados',
        items: rolesSinPermisos.map(r => ({ nombre: r.nombre, tenant: r.tenant_nombre }))
      });
    }

    // Roles sin usuarios
    const rolesSinUsuarios = await sql`
      SELECT 
        r.id, r.nombre, r.tenant_id, t.nombre as tenant_nombre
      FROM roles r
      LEFT JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON r.id = ur.rol_id
      WHERE ur.rol_id IS NULL
      ORDER BY t.nombre, r.nombre
    `;

    if (rolesSinUsuarios.rows.length > 0) {
      inconsistencias.push({
        tipo: 'roles_sin_usuarios',
        descripcion: 'Roles sin usuarios asignados',
        items: rolesSinUsuarios.rows.map(r => ({ nombre: r.nombre, tenant: r.tenant_nombre }))
      });
    }

    // 6. Estadísticas generales
    const estadisticas = {
      totalTenants: tenants.rows.length,
      totalRoles: roles.rows.length,
      totalPermisos: permisos.rows.length,
      totalUsuarios: usuarios.rows.length,
      usuariosConRoles: usuarios.rows.filter(u => u.roles_asignados).length,
      rolesConPermisos: roles.rows.filter(r => r.permisos_count > 0).length,
      totalInconsistencias: inconsistencias.length
    };

    // 7. Verificar permisos por módulo (extraer módulo de la clave)
    const permisosPorModulo = await sql`
      SELECT 
        SPLIT_PART(clave, '.', 1) as modulo,
        COUNT(*) as total_permisos,
        STRING_AGG(clave, ', ' ORDER BY clave) as permisos
      FROM permisos 
      GROUP BY SPLIT_PART(clave, '.', 1)
      ORDER BY modulo
    `;

    return NextResponse.json({
      success: true,
      auditoria: {
        timestamp: new Date().toISOString(),
        estadisticas,
        tenants: tenants.rows,
        roles: roles.rows,
        permisos: permisos.rows,
        usuarios: usuarios.rows,
        permisosPorModulo: permisosPorModulo.rows,
        inconsistencias
      }
    });

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
