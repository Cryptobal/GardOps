import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 VERIFICANDO PERMISOS ACTUALES...');

    // Obtener todos los roles con sus permisos
    const rolesConPermisos = await sql`
      SELECT 
        t.nombre as tenant_nombre,
        r.nombre as rol_nombre,
        r.descripcion as rol_descripcion,
        COUNT(rp.permiso_id) as total_permisos,
        STRING_AGG(p.clave, ', ' ORDER BY p.clave) as permisos_lista
      FROM roles r
      JOIN tenants t ON r.tenant_id = t.id
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      LEFT JOIN permisos p ON rp.permiso_id = p.id
      GROUP BY t.nombre, r.nombre, r.descripcion
      ORDER BY t.nombre, r.nombre
    `;

    console.log('\n📊 Permisos por rol:');
    rolesConPermisos.rows.forEach(rol => {
      console.log(`   ${rol.tenant_nombre} - ${rol.rol_nombre}: ${rol.total_permisos} permisos`);
    });

    // Verificar diferencias entre Super Admin y Tenant Admin
    const superAdmin = rolesConPermisos.rows.find(r => r.rol_nombre === 'Super Admin');
    const tenantAdmin = rolesConPermisos.rows.find(r => r.rol_nombre === 'Tenant Admin');

    let analisis = {
      super_admin_permisos: superAdmin?.total_permisos || 0,
      tenant_admin_permisos: tenantAdmin?.total_permisos || 0,
      diferencia: (superAdmin?.total_permisos || 0) - (tenantAdmin?.total_permisos || 0),
      estado: 'OK'
    };

    if (tenantAdmin && tenantAdmin.total_permisos < 100) {
      analisis.estado = 'PROBLEMA: Tenant Admin tiene muy pocos permisos';
    }

    return NextResponse.json({
      success: true,
      roles: rolesConPermisos.rows,
      analisis
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      error: 'Error al verificar permisos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
