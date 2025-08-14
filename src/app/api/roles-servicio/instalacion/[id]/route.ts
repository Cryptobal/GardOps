import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener roles de servicio de una instalación
export async function GET(
  request: NextRequest,
  {

 params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    
    // Obtener los roles de servicio asociados a la instalación a través de puestos operativos
    const result = await query(`
      SELECT DISTINCT
        rs.id,
        rs.nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.created_at
      FROM as_turnos_roles_servicio rs
      INNER JOIN as_turnos_puestos_operativos po ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      ORDER BY rs.nombre
    `, [instalacionId]);
    
    const rows = Array.isArray(result) ? result : (result.rows || []);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error obteniendo roles de servicio:', error);
    return NextResponse.json(
      { error: 'Error al obtener roles de servicio' },
      { status: 500 }
    );
  }
}
