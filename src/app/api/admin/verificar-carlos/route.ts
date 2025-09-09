import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando estado de Carlos Irigoyen...');

    // Verificar datos de Carlos
    const carlos = await sql`
      SELECT u.id, u.email, u.tenant_id, t.nombre as tenant_nombre
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
    `;

    // Verificar roles de Carlos
    const carlosRoles = await sql`
      SELECT u.email, r.nombre as rol, t.nombre as tenant
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN tenants t ON r.tenant_id = t.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
    `;

    // Verificar todos los tenants
    const tenants = await sql`
      SELECT id, nombre FROM tenants ORDER BY nombre
    `;

    // Verificar roles por tenant
    const rolesPorTenant = await sql`
      SELECT t.nombre as tenant, COUNT(r.id) as total_roles, STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
      FROM tenants t
      LEFT JOIN roles r ON t.id = r.tenant_id
      WHERE r.nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
      GROUP BY t.id, t.nombre
      ORDER BY t.nombre
    `;

    // Verificar permisos del Super Admin si existe
    let superAdminPermisos = [];
    if (carlosRoles.rows.length > 0) {
      superAdminPermisos = await sql`
        SELECT p.clave, p.descripcion
        FROM usuarios u
        JOIN usuarios_roles ur ON u.id = ur.usuario_id
        JOIN roles r ON ur.rol_id = r.id
        JOIN roles_permisos rp ON r.id = rp.rol_id
        JOIN permisos p ON rp.permiso_id = p.id
        WHERE u.email = 'carlos.irigoyen@gard.cl'
        ORDER BY p.clave
      `;
    }

    return NextResponse.json({
      carlos: carlos.rows[0] || null,
      carlosRoles: carlosRoles.rows,
      tenants: tenants.rows,
      rolesPorTenant: rolesPorTenant.rows,
      superAdminPermisos: superAdminPermisos.rows,
      necesitaRol: carlosRoles.rows.length === 0
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Asignando rol Super Admin a Carlos Irigoyen...');

    // Obtener tenant Gard
    const gardTenant = await sql`
      SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
    `;

    if (gardTenant.rows.length === 0) {
      return NextResponse.json({ error: 'No se encontró el tenant Gard' }, { status: 400 });
    }

    const gardTenantId = gardTenant.rows[0].id;

    // Actualizar tenant de Carlos a Gard
    await sql`
      UPDATE usuarios 
      SET tenant_id = ${gardTenantId}::uuid 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;

    // Obtener rol Super Admin de Gard
    const gardSuperAdmin = await sql`
      SELECT id FROM roles 
      WHERE nombre = 'Super Admin' AND tenant_id = ${gardTenantId}::uuid
      LIMIT 1
    `;

    if (gardSuperAdmin.rows.length === 0) {
      return NextResponse.json({ error: 'No se encontró el rol Super Admin en Gard' }, { status: 400 });
    }

    // Eliminar roles anteriores de Carlos
    await sql`
      DELETE FROM usuarios_roles 
      WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl')
    `;

    // Asignar rol Super Admin de Gard a Carlos
    await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id) 
      VALUES (
        (SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl'),
        ${gardSuperAdmin.rows[0].id}::uuid
      )
    `;

    // Verificar la asignación
    const asignacionVerificada = await sql`
      SELECT 
        u.email,
        r.nombre as rol_asignado,
        t.nombre as tenant
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN tenants t ON r.tenant_id = t.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
    `;

    // Verificar permisos totales
    const permisosTotales = await sql`
      SELECT COUNT(p.id) as total_permisos
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
    `;

    console.log('✅ Rol Super Admin asignado exitosamente a Carlos');

    return NextResponse.json({
      success: true,
      message: 'Carlos asignado correctamente al tenant Gard con rol Super Admin',
      asignacion: asignacionVerificada.rows[0],
      permisosTotales: permisosTotales.rows[0]?.total_permisos || 0
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
