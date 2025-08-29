import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 CREANDO ROLES ESTÁNDAR PARA TENANT DEMO...');

    // 1. Buscar el tenant Demo
    const tenant = await sql`
      SELECT id, nombre FROM tenants WHERE nombre = 'Tenant Demo'
    `;

    if (tenant.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Tenant Demo no encontrado' 
      }, { status: 404 });
    }

    const tenantData = tenant.rows[0];
    console.log(`Tenant: ${tenantData.nombre} (${tenantData.id})`);

    // 2. Crear roles faltantes (Operador y Consulta)
    console.log('\n👑 Creando roles faltantes...');
    
    const rolesFaltantes = await sql`
      INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Operador', 'Operador con acceso a pautas diarias y turnos', ${tenantData.id}::uuid),
        (gen_random_uuid(), 'Consulta', 'Usuario con acceso de solo lectura a reportes y consultas', ${tenantData.id}::uuid)
      ON CONFLICT (tenant_id, nombre) DO NOTHING
      RETURNING id, nombre, descripcion
    `;

    console.log('Roles faltantes creados:', rolesFaltantes.rows);

    // 3. Obtener permisos disponibles
    console.log('\n🔑 Obteniendo permisos disponibles...');
    const permisos = await sql`SELECT id, clave as nombre FROM permisos ORDER BY clave`;
    console.log(`Total permisos encontrados: ${permisos.rows.length}`);

    // 4. Asignar permisos a los nuevos roles
    console.log('\n🔐 Asignando permisos a roles...');
    
    const operador = rolesFaltantes.rows.find(r => r.nombre === 'Operador');
    const consulta = rolesFaltantes.rows.find(r => r.nombre === 'Consulta');

    // Operador: permisos operativos
    if (operador) {
      const permisosOperador = permisos.rows.filter(p => 
        ['home.view', 'clientes.view', 'instalaciones.view', 'guardias.view',
         'pauta_mensual.view', 'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit',
         'turnos_extras.view', 'turnos_extras.create', 'documentos.view'].includes(p.nombre)
      );
      
      for (const permiso of permisosOperador) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${operador.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Operador');
    }

    // Consulta: permisos de solo lectura
    if (consulta) {
      const permisosConsulta = permisos.rows.filter(p => 
        ['home.view', 'clientes.view', 'instalaciones.view', 'guardias.view',
         'pauta_mensual.view', 'pauta_diaria.view', 'turnos_extras.view',
         'payroll.view', 'documentos.view', 'alertas.view'].includes(p.nombre)
      );
      
      for (const permiso of permisosConsulta) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${consulta.id}::uuid, ${permiso.id}::uuid)
          ON CONFLICT (rol_id, permiso_id) DO NOTHING
        `;
      }
      console.log('✅ Permisos asignados a Consulta');
    }

    // 5. Verificar resultado final
    const rolesFinales = await sql`
      SELECT r.nombre, r.descripcion, COUNT(rp.permiso_id) as permisos_asignados
      FROM roles r
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE r.tenant_id = ${tenantData.id}::uuid
      GROUP BY r.id, r.nombre, r.descripcion
      ORDER BY r.nombre
    `;

    console.log('\n📊 Roles finales del Tenant Demo:');
    rolesFinales.rows.forEach(rol => {
      console.log(`   ${rol.nombre}: ${rol.permisos_asignados} permisos`);
    });

    return NextResponse.json({
      success: true,
      message: 'Roles estándar creados exitosamente para Tenant Demo',
      roles: rolesFinales.rows,
      tenant: tenantData.nombre
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      error: 'Error al crear roles estándar para Tenant Demo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
