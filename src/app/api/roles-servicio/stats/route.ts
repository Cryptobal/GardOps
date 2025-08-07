import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '1';

    // Consulta directa para obtener estadísticas de roles
    const rolesQuery = `
      SELECT 
        COUNT(*) as total_roles,
        COUNT(*) FILTER (WHERE estado = 'Activo') as roles_activos,
        COUNT(*) FILTER (WHERE estado = 'Inactivo') as roles_inactivos
      FROM as_turnos_roles_servicio 
      WHERE (tenant_id::text = $1 OR (tenant_id IS NULL AND $1 = '1'))
    `;
    
    const rolesResult = await sql.query(rolesQuery, [tenantId]);
    const rolesStats = rolesResult.rows[0];

    // Consulta para obtener estadísticas de estructuras (si la tabla existe)
    let estructurasStats = {
      total_estructuras: 0,
      estructuras_activas: 0,
      estructuras_inactivas: 0
    };

    try {
      const estructurasQuery = `
        SELECT 
          COUNT(*) as total_estructuras,
          COUNT(*) FILTER (WHERE estado = 'Activo') as estructuras_activas,
          COUNT(*) FILTER (WHERE estado = 'Inactivo') as estructuras_inactivas
        FROM as_turnos_estructuras_servicio 
        WHERE (tenant_id::text = $1 OR (tenant_id IS NULL AND $1 = '1'))
      `;
      
      const estructurasResult = await sql.query(estructurasQuery, [tenantId]);
      estructurasStats = estructurasResult.rows[0];
    } catch (error) {
      console.log('Tabla as_turnos_estructuras_servicio no existe o no es accesible');
    }

    // Consulta para roles con estructura
    let rolesConEstructura = 0;
    let rolesSinEstructura = 0;

    try {
      const rolesConEstructuraQuery = `
        SELECT 
          COUNT(DISTINCT rs.id) as roles_con_estructura
        FROM as_turnos_roles_servicio rs
        INNER JOIN as_turnos_estructuras_servicio es ON es.rol_servicio_id = rs.id
        WHERE (rs.tenant_id::text = $1 OR (rs.tenant_id IS NULL AND $1 = '1'))
      `;
      
      const rolesConEstructuraResult = await sql.query(rolesConEstructuraQuery, [tenantId]);
      rolesConEstructura = parseInt(rolesConEstructuraResult.rows[0]?.roles_con_estructura || '0');
      rolesSinEstructura = rolesStats.total_roles - rolesConEstructura;
    } catch (error) {
      console.log('No se pudo obtener estadísticas de roles con estructura');
      rolesSinEstructura = rolesStats.total_roles;
    }

    const stats = {
      total_roles: parseInt(rolesStats.total_roles),
      roles_activos: parseInt(rolesStats.roles_activos),
      roles_inactivos: parseInt(rolesStats.roles_inactivos),
      total_estructuras: parseInt(estructurasStats.total_estructuras),
      estructuras_activas: parseInt(estructurasStats.estructuras_activas),
      estructuras_inactivas: parseInt(estructurasStats.estructuras_inactivas),
      roles_con_estructura: rolesConEstructura,
      roles_sin_estructura: rolesSinEstructura
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de roles de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
