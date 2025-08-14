import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'roles_servicio', action: 'read:list' });
if (deny) return deny;

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

    // Consulta para roles con guardias asignados
    let rolesConGuardias = 0;

    try {
      const rolesConGuardiasQuery = `
        SELECT 
          COUNT(DISTINCT rs.id) as roles_con_guardias
        FROM as_turnos_roles_servicio rs
        INNER JOIN as_turnos_puestos_operativos po ON po.rol_id = rs.id
        WHERE (rs.tenant_id::text = $1 OR (rs.tenant_id IS NULL AND $1 = '1'))
          AND po.guardia_id IS NOT NULL 
          AND po.es_ppc = false 
          AND po.activo = true
      `;
      
      const rolesConGuardiasResult = await sql.query(rolesConGuardiasQuery, [tenantId]);
      rolesConGuardias = parseInt(rolesConGuardiasResult.rows[0]?.roles_con_guardias || '0');
      console.log('🔍 Roles con guardias asignados:', rolesConGuardias);
    } catch (error) {
      console.log('No se pudo obtener estadísticas de roles con guardias:', error);
      rolesConGuardias = 0;
    }

    const stats = {
      total: parseInt(rolesStats.total_roles),
      activos: parseInt(rolesStats.roles_activos),
      inactivos: parseInt(rolesStats.roles_inactivos),
      conGuardias: rolesConGuardias, // Roles que tienen guardias asignados en puestos operativos
      total_estructuras: parseInt(estructurasStats.total_estructuras),
      estructuras_activas: parseInt(estructurasStats.estructuras_activas),
      estructuras_inactivas: parseInt(estructurasStats.estructuras_inactivas)
    };

    console.log('📊 Estadísticas finales:', stats);
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
