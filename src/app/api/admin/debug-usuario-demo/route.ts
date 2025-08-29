import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // Buscar el usuario demo@demo.com
    const { rows: usuarios } = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.tenant_id,
        u.rol,
        u.activo
      FROM usuarios u
      WHERE u.email = 'demo@demo.com'
    `;

    if (usuarios.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario demo@demo.com no encontrado' 
      });
    }

    const usuario = usuarios[0];

    // Verificar roles asignados al usuario
    const { rows: rolesAsignados } = await sql`
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id = ${usuario.id}::uuid
    `;

    // Verificar datos que puede ver el usuario (clientes, instalaciones, guardias)
    const { rows: clientesCount } = await sql`
      SELECT COUNT(*) as total
      FROM clientes
      WHERE tenant_id = ${usuario.tenant_id}::uuid
    `;

    const { rows: instalacionesCount } = await sql`
      SELECT COUNT(*) as total
      FROM instalaciones
      WHERE tenant_id = ${usuario.tenant_id}::uuid
    `;

    const { rows: guardiasCount } = await sql`
      SELECT COUNT(*) as total
      FROM guardias
      WHERE tenant_id = ${usuario.tenant_id}::uuid
    `;

    // Verificar datos totales en el sistema (para comparar)
    const { rows: totalClientes } = await sql`
      SELECT COUNT(*) as total
      FROM clientes
    `;

    const { rows: totalInstalaciones } = await sql`
      SELECT COUNT(*) as total
      FROM instalaciones
    `;

    const { rows: totalGuardias } = await sql`
      SELECT COUNT(*) as total
      FROM guardias
    `;

    return NextResponse.json({
      success: true,
      usuario,
      rolesAsignados,
      datosDelTenant: {
        clientes: clientesCount[0]?.total || 0,
        instalaciones: instalacionesCount[0]?.total || 0,
        guardias: guardiasCount[0]?.total || 0
      },
      datosTotales: {
        clientes: totalClientes[0]?.total || 0,
        instalaciones: totalInstalaciones[0]?.total || 0,
        guardias: totalGuardias[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('Error debugging usuario demo:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
