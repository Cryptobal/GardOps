import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { sql } = await import('@vercel/postgres');
    
    console.log('🔍 AUDITORÍA COMPLETA DE LA BASE DE DATOS...');
    
    // 1. Estructura de tabla usuarios
    const userColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    // 2. Estructura de tabla roles
    const roleColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'roles' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    // 3. Estructura de tabla permisos
    const permColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'permisos' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    // 4. Estructura de tabla usuarios_roles
    const userRoleColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuarios_roles' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    // 5. Estructura de tabla roles_permisos
    const rolePermColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'roles_permisos' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    // 6. Obtener un usuario de ejemplo
    const sampleUser = await sql`
      SELECT * FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl' LIMIT 1
    `;
    
    // 7. Obtener un rol de ejemplo
    const sampleRole = await sql`
      SELECT * FROM roles WHERE nombre = 'admin' OR nombre = 'Administrador' LIMIT 1
    `;
    
    // 8. Obtener un permiso de ejemplo
    const samplePerm = await sql`
      SELECT * FROM permisos WHERE clave = 'clientes.view' LIMIT 1
    `;
    
    return NextResponse.json({
      success: true,
      audit: {
        usuarios: {
          columns: userColumns.rows,
          sample: sampleUser.rows[0] || null,
          primary_key: userColumns.rows.find(c => c.column_name === 'id' || c.column_name === 'usuario_id') || 'UNKNOWN'
        },
        roles: {
          columns: roleColumns.rows,
          sample: sampleRole.rows[0] || null,
          primary_key: roleColumns.rows.find(c => c.column_name === 'id' || c.column_name === 'rol_id') || 'UNKNOWN'
        },
        permisos: {
          columns: permColumns.rows,
          sample: samplePerm.rows[0] || null,
          primary_key: permColumns.rows.find(c => c.column_name === 'id' || c.column_name === 'permiso_id') || 'UNKNOWN'
        },
        usuarios_roles: {
          columns: userRoleColumns.rows
        },
        roles_permisos: {
          columns: rolePermColumns.rows
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en auditoría',
      details: error.message
    }, { status: 500 });
  }
}