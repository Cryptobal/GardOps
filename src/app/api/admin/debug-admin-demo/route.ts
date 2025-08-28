import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging admin@demo.com...');

    // 1. Verificar usuario
    const usuarioResult = await sql`
      SELECT id, email, nombre, tenant_id, rol 
      FROM usuarios 
      WHERE email = 'admin@demo.com'
    `;
    
    if (usuarioResult.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario admin@demo.com no encontrado' }, { status: 404 });
    }
    
    const usuario = usuarioResult.rows[0];

    // 2. Verificar tenant
    const tenantResult = await sql`
      SELECT id, nombre 
      FROM tenants 
      WHERE nombre = 'Tenant Demo'
    `;
    
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant Demo no encontrado' }, { status: 404 });
    }
    
    const tenant = tenantResult.rows[0];

    // 3. Verificar roles del tenant
    const rolesResult = await sql`
      SELECT id, nombre, descripcion 
      FROM roles 
      WHERE tenant_id = ${tenant.id}
      ORDER BY nombre
    `;

    // 4. Verificar roles asignados
    const rolesUsuarioResult = await sql`
      SELECT r.id, r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id = ${usuario.id}
    `;

    return NextResponse.json({
      success: true,
      usuario: usuario,
      tenant: tenant,
      rolesDelTenant: rolesResult.rows,
      rolesAsignados: rolesUsuarioResult.rows
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
