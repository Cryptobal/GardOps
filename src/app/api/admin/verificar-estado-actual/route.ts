import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requireAuthz } from '@/lib/authz-api';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuthz(request);
    
    // Solo permitir Platform Admins
    if (!ctx.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    console.log('🔍 VERIFICANDO ESTADO ACTUAL DE ROLES Y PERMISOS');

    // 1. Verificar roles existentes
    const roles = await sql`SELECT id, nombre, descripcion FROM roles ORDER BY nombre`;
    
    // 2. Verificar usuarios y sus roles
    const usuariosRoles = await sql`
      SELECT 
        u.email,
        t.nombre as tenant,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_asignados
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON ur.rol_id = r.id
      GROUP BY u.id, u.email, t.nombre
      ORDER BY u.email
    `;

    // 3. Verificar específicamente Carlos.Irigoyen@gard.cl
    const carlos = await sql`
      SELECT 
        u.email,
        u.rol,
        t.nombre as tenant,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_asignados,
        CASE 
          WHEN COUNT(r.id) = 0 THEN 'SIN ROLES ASIGNADOS'
          ELSE 'CON ROLES'
        END as estado
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON ur.rol_id = r.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      GROUP BY u.id, u.email, u.rol, t.nombre
    `;

    // 4. Verificar permisos del Super Admin
    const superAdminPermisos = await sql`
      SELECT p.clave, p.descripcion
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.nombre = 'Super Admin'
      ORDER BY p.clave
    `;

    // 5. Verificar permisos especiales del Super Admin
    const permisosEspeciales = await sql`
      SELECT p.clave, p.descripcion
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.nombre = 'Super Admin'
      AND (p.clave LIKE 'rbac.%' OR p.clave LIKE '%admin%' OR p.clave LIKE '%platform%')
      ORDER BY p.clave
    `;

    // 6. Usuarios sin roles asignados
    const usuariosSinRoles = await sql`
      SELECT u.email, u.rol, t.nombre as tenant
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      WHERE ur.usuario_id IS NULL
      ORDER BY u.email
    `;

    return NextResponse.json({
      roles: roles.rows,
      usuariosRoles: usuariosRoles.rows,
      carlos: carlos.rows[0] || null,
      superAdminPermisos: superAdminPermisos.rows,
      permisosEspeciales: permisosEspeciales.rows,
      usuariosSinRoles: usuariosSinRoles.rows,
      resumen: {
        totalRoles: roles.rows.length,
        usuariosSinRoles: usuariosSinRoles.rows.length,
        permisosSuperAdmin: superAdminPermisos.rows.length,
        permisosEspeciales: permisosEspeciales.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
