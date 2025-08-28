import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Corrigiendo permisos de admin@demo.com...');

    // Asignar el rol Tenant Admin a admin@demo.com
    const result = await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      SELECT 
        (SELECT id FROM usuarios WHERE email = 'admin@demo.com'),
        (SELECT id FROM roles WHERE nombre = 'Tenant Admin' AND tenant_id = (SELECT id FROM tenants WHERE nombre = 'Tenant Demo'))
      ON CONFLICT (usuario_id, rol_id) DO NOTHING
      RETURNING usuario_id, rol_id
    `;

    // Verificar que se asignó correctamente
    const verification = await sql`
      SELECT r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@demo.com')
    `;

    console.log('✅ Permisos corregidos para admin@demo.com');

    return NextResponse.json({
      success: true,
      message: 'Permisos corregidos correctamente',
      rolesAsignados: verification.rows,
      rolAsignado: result.rows.length > 0
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
