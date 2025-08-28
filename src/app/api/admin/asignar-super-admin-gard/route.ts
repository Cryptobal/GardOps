import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 ASIGNANDO ROL SUPER ADMIN A CARLOS.IRIGOYEN@GARD.CL...');

    // 1. Buscar el usuario carlos.irigoyen@gard.cl
    const usuario = await sql`
      SELECT u.id, u.email, u.nombre, u.tenant_id, t.nombre as tenant_nombre
      FROM usuarios u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
    `;

    if (usuario.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Usuario carlos.irigoyen@gard.cl no encontrado' 
      }, { status: 404 });
    }

    const userData = usuario.rows[0];
    console.log(`Usuario encontrado: ${userData.nombre} (${userData.email}) en tenant ${userData.tenant_nombre}`);

    // 2. Buscar el rol Super Admin del tenant Gard
    const superAdminRole = await sql`
      SELECT id, nombre, descripcion
      FROM roles
      WHERE tenant_id = ${userData.tenant_id}::uuid
      AND nombre = 'Super Admin'
    `;

    if (superAdminRole.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Rol Super Admin no encontrado en el tenant Gard' 
      }, { status: 404 });
    }

    const roleData = superAdminRole.rows[0];
    console.log(`Rol Super Admin encontrado: ${roleData.nombre} (${roleData.id})`);

    // 3. Verificar si ya tiene el rol asignado
    const asignacionExistente = await sql`
      SELECT usuario_id, rol_id
      FROM usuarios_roles
      WHERE usuario_id = ${userData.id}::uuid
      AND rol_id = ${roleData.id}::uuid
    `;

    if (asignacionExistente.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'El usuario ya tiene asignado el rol Super Admin',
        usuario: userData,
        rol: roleData
      });
    }

    // 4. Asignar el rol Super Admin al usuario
    await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      VALUES (${userData.id}::uuid, ${roleData.id}::uuid)
      ON CONFLICT (usuario_id, rol_id) DO NOTHING
    `;

    console.log('✅ Rol Super Admin asignado exitosamente');

    // 5. Verificar roles actuales del usuario
    const rolesUsuario = await sql`
      SELECT r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id = ${userData.id}::uuid
      ORDER BY r.nombre
    `;

    console.log('📊 Roles actuales del usuario:');
    rolesUsuario.rows.forEach(rol => {
      console.log(`   - ${rol.nombre}: ${rol.descripcion}`);
    });

    return NextResponse.json({
      success: true,
      message: 'Rol Super Admin asignado exitosamente',
      usuario: userData,
      rol: roleData,
      roles_actuales: rolesUsuario.rows
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      error: 'Error al asignar rol Super Admin',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
