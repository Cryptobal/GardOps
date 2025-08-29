import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('👤 Asignando rol Super Admin a Carlos Irigoyen...');

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

    // 2. Buscar usuario Carlos Irigoyen
    const carlos = await sql`
      SELECT id, email, nombre FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl' LIMIT 1
    `;

    if (carlos.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario carlos.irigoyen@gard.cl no encontrado' },
        { status: 404 }
      );
    }

    // 3. Buscar rol Super Admin
    const superAdminRole = await sql`
      SELECT id, nombre FROM roles 
      WHERE nombre = 'Super Admin' AND tenant_id = ${gardTenant.rows[0].id}::uuid
      LIMIT 1
    `;

    if (superAdminRole.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rol Super Admin no encontrado en el tenant Gard' },
        { status: 404 }
      );
    }

    // 4. Eliminar asignaciones previas de Carlos
    await sql`
      DELETE FROM usuarios_roles WHERE usuario_id = ${carlos.rows[0].id}::uuid
    `;

    // 5. Asignar rol Super Admin
    await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id) 
      VALUES (${carlos.rows[0].id}::uuid, ${superAdminRole.rows[0].id}::uuid)
    `;

    console.log('✅ Rol Super Admin asignado exitosamente');

    // 6. Verificar permisos asignados
    const permisosAsignados = await sql`
      SELECT COUNT(p.id) as total_permisos
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
    `;

    return NextResponse.json({
      success: true,
      message: 'Rol Super Admin asignado exitosamente',
      usuario: {
        id: carlos.rows[0].id,
        email: carlos.rows[0].email,
        nombre: carlos.rows[0].nombre
      },
      rol: {
        id: superAdminRole.rows[0].id,
        nombre: superAdminRole.rows[0].nombre
      },
      tenant: gardTenant.rows[0],
      permisosAsignados: permisosAsignados.rows[0]?.total_permisos || 0
    });

  } catch (error) {
    console.error('❌ Error asignando rol:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
