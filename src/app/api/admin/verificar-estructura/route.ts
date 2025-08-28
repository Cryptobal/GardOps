import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    // Verificar estructura de rbac_permisos
    const permisos = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rbac_permisos' 
      ORDER BY ordinal_position
    `;

    // Verificar estructura de permisos (si existe)
    const permisosTable = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'permisos' 
      ORDER BY ordinal_position
    `;

    // Verificar estructura de roles
    const roles = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position
    `;

    // Verificar estructura de tenants
    const tenants = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      ORDER BY ordinal_position
    `;

    // Verificar estructura de roles_permisos
    const rolesPermisos = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles_permisos' 
      ORDER BY ordinal_position
    `;

    // Verificar algunos registros de permisos
    const permisosSample = await sql`
      SELECT * FROM rbac_permisos LIMIT 3
    `;

    // Verificar algunos registros de permisos (si existe)
    let permisosTableSample = [];
    try {
      const result = await sql`SELECT * FROM permisos LIMIT 3`;
      permisosTableSample = result.rows;
    } catch (e) {
      permisosTableSample = [{ error: 'Tabla permisos no existe' }];
    }

    // Verificar algunos registros de roles_permisos
    const rolesPermisosSample = await sql`
      SELECT * FROM roles_permisos LIMIT 3
    `;

    return NextResponse.json({
      rbac_permisos_columns: permisos.rows,
      permisos_columns: permisosTable.rows,
      roles_columns: roles.rows,
      tenants_columns: tenants.rows,
      roles_permisos_columns: rolesPermisos.rows,
      permisos_sample: permisosSample.rows,
      permisos_table_sample: permisosTableSample,
      roles_permisos_sample: rolesPermisosSample.rows
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
