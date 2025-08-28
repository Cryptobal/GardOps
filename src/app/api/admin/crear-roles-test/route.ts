import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 INICIANDO PRUEBA DE CREACIÓN DE ROLES...');

    // 1. Verificar tenants existentes
    console.log('\n📋 Verificando tenants existentes...');
    const tenants = await sql`
      SELECT id, nombre
      FROM tenants
      ORDER BY nombre
    `;
    console.log('Tenants encontrados:', tenants.rows);

    // 2. Obtener IDs de tenants
    const gardTenant = tenants.rows.find(t => t.nombre === 'Gard');
    const demoTenant = tenants.rows.find(t => t.nombre === 'Tenant Demo');

    console.log('Gard tenant_id:', gardTenant?.id);
    console.log('Demo tenant_id:', demoTenant?.id);

    if (!gardTenant || !demoTenant) {
      return NextResponse.json({ 
        error: 'No se encontraron los tenants Gard o Tenant Demo',
        tenants: tenants.rows 
      }, { status: 400 });
    }

    // 3. Verificar permisos existentes
    console.log('\n🔑 Verificando permisos...');
    const permisos = await sql`SELECT id, clave FROM permisos LIMIT 5`;
    console.log('Permisos encontrados:', permisos.rows);

    // 4. Crear solo un rol de prueba para Gard
    console.log('\n👑 Creando rol de prueba para Gard...');
    
    const gardRole = await sql`
      INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Super Admin Test', 'Rol de prueba', ${gardTenant.id}::uuid)
      ON CONFLICT (nombre) DO UPDATE SET 
        descripcion = EXCLUDED.descripcion,
        tenant_id = EXCLUDED.tenant_id
      RETURNING id, nombre
    `;

    console.log('Rol de Gard creado:', gardRole.rows);

    // 5. Verificar resultado
    const rolesFinales = await sql`
      SELECT t.nombre as tenant, COUNT(r.id) as total_roles, STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
      FROM tenants t
      LEFT JOIN roles r ON t.id = r.tenant_id
      WHERE r.nombre LIKE '%Test%'
      GROUP BY t.id, t.nombre
      ORDER BY t.nombre
    `;

    return NextResponse.json({
      success: true,
      message: 'Rol de prueba creado exitosamente',
      rolesPorTenant: rolesFinales.rows,
      tenants: tenants.rows,
      permisos: permisos.rows
    });

  } catch (error) {
    console.error('❌ Error durante la ejecución:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
