import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET: Obtener PPCs de una instalación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;

    const result = await query(`
      SELECT 
        ppc.id,
        rp.instalacion_id,
        rp.rol_servicio_id,
        ppc.motivo,
        ppc.observaciones as observacion,
        ppc.created_at as creado_en,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        ppc.cantidad_faltante,
        ppc.estado
      FROM puestos_por_cubrir ppc
      INNER JOIN requisitos_puesto rp ON ppc.requisito_puesto_id = rp.id
      LEFT JOIN roles_servicio rs ON rp.rol_servicio_id = rs.id
      WHERE rp.instalacion_id = $1
      ORDER BY ppc.created_at DESC
    `, [instalacionId]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo PPCs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Asignar guardia a un PPC
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { ppc_id, guardia_id } = body;

    if (!ppc_id || !guardia_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el PPC existe y pertenece a esta instalación
    const ppcCheck = await query(`
      SELECT ppc.id 
      FROM puestos_por_cubrir ppc
      INNER JOIN requisitos_puesto rp ON ppc.requisito_puesto_id = rp.id
      WHERE ppc.id = $1 AND rp.instalacion_id = $2
    `, [ppc_id, instalacionId]);

    if (ppcCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'PPC no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el guardia existe
    const guardiaCheck = await query(
      'SELECT id FROM guardias WHERE id = $1',
      [guardia_id]
    );

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Marcar PPC como asignado (por ahora solo actualizamos el estado)
    const result = await query(`
      UPDATE puestos_por_cubrir 
      SET estado = 'Asignado', observaciones = CONCAT(COALESCE(observaciones, ''), ' - Asignado guardia: ', now())
      WHERE id = $2
      RETURNING *
    `, [guardia_id, ppc_id]);

    console.log('✅ Guardia asignado al PPC correctamente');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error asignando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 