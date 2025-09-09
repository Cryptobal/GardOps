import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando roles del Tenant Demo...');

    // 1. Verificar el tenant Demo
    const tenantResult = await sql`
      SELECT id, nombre 
      FROM tenants 
      WHERE nombre = 'Tenant Demo'
    `;
    
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant Demo no encontrado' }, { status: 404 });
    }
    
    const tenant = tenantResult.rows[0];

    // 2. Verificar roles del tenant
    const rolesResult = await sql`
      SELECT id, nombre, descripcion, tenant_id 
      FROM roles 
      WHERE tenant_id = ${tenant.id}
      ORDER BY nombre
    `;

    // 3. Verificar permisos de cada rol
    const rolesConPermisos = [];
    for (const rol of rolesResult.rows) {
      const permisosResult = await sql`
        SELECT p.clave, p.descripcion
        FROM roles_permisos rp
        JOIN permisos p ON rp.permiso_id = p.id
        WHERE rp.rol_id = ${rol.id}
        ORDER BY p.clave
      `;
      
      rolesConPermisos.push({
        ...rol,
        permisos: permisosResult.rows
      });
    }

    // 4. Verificar usuario admin@demo.com
    const usuarioResult = await sql`
      SELECT id, email, nombre, tenant_id, rol 
      FROM usuarios 
      WHERE email = 'admin@demo.com'
    `;
    
    let usuario = null;
    let rolesAsignados = [];
    
    if (usuarioResult.rows.length > 0) {
      usuario = usuarioResult.rows[0];
      
      // Verificar roles asignados
      const rolesUsuarioResult = await sql`
        SELECT r.id, r.nombre, r.descripcion
        FROM usuarios_roles ur
        JOIN roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = ${usuario.id}
      `;
      
      rolesAsignados = rolesUsuarioResult.rows;
    }

    return NextResponse.json({
      success: true,
      tenant: tenant,
      roles: rolesConPermisos,
      usuario: usuario,
      rolesAsignados: rolesAsignados
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
