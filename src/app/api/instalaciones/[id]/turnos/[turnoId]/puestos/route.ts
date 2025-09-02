import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  const deny = await requireAuthz(request, { resource: 'instalaciones', action: 'read:list' });
  if (deny) return deny;

  try {
    const { id: instalacionId, turnoId } = params;

    // Obtener todos los puestos del turno
    const result = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id,
        po.creado_en,
        g.nombre || ' ' || g.apellido_paterno || ' ' || COALESCE(g.apellido_materno, '') as guardia_nombre,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.rol_id = $1 
        AND po.instalacion_id = $2 
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [turnoId, instalacionId]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo puestos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
