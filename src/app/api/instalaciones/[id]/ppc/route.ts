import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET: Obtener PPCs de una instalación usando las nuevas tablas ADO
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;

    const result = await query(`
      SELECT 
        ppc.id,
        tr.instalacion_id,
        tr.rol_servicio_id,
        ppc.motivo,
        ppc.observaciones as observacion,
        ppc.created_at as creado_en,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        ppc.cantidad_faltante,
        ppc.estado,
        ppc.guardia_asignado_id,
        g.nombre || ' ' || g.apellido_paterno || ' ' || g.apellido_materno as guardia_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      LEFT JOIN guardias g ON ppc.guardia_asignado_id = g.id
      WHERE tr.instalacion_id = $1
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

// POST: Asignar guardia a un PPC usando las nuevas tablas ADO
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
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE ppc.id = $1 AND tr.instalacion_id = $2
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

    // Marcar PPC como asignado y crear asignación
    const result = await query(`
      UPDATE as_turnos_ppc 
      SET estado = 'Asignado', 
          guardia_asignado_id = $1,
          fecha_asignacion = NOW(),
          observaciones = CONCAT(COALESCE(observaciones, ''), ' - Asignado guardia: ', now())
      WHERE id = $2
      RETURNING *
    `, [guardia_id, ppc_id]);

    // Crear asignación en as_turnos_asignaciones
    const ppcData = result.rows[0];
    if (ppcData) {
      await query(`
        INSERT INTO as_turnos_asignaciones (
          guardia_id,
          requisito_puesto_id,
          tipo_asignacion,
          fecha_inicio,
          estado,
          observaciones
        ) VALUES ($1, $2, $3, CURRENT_DATE, 'Activa', $4)
      `, [guardia_id, ppcData.requisito_puesto_id, 'PPC', 'Asignación automática desde PPC']);
    }

    console.log('✅ Guardia asignado al PPC correctamente usando tablas ADO');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error asignando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 