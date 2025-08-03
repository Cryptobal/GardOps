import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; ppcId: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/ppc/[ppcId]/desasignar");
  
  try {
    const instalacionId = params.id;
    const ppcId = params.ppcId;

    // Verificar que el PPC existe y pertenece a esta instalación
    const ppcCheck = await query(`
      SELECT 
        ppc.id,
        ppc.guardia_asignado_id,
        ppc.requisito_puesto_id
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE ppc.id = $1 AND tr.instalacion_id = $2 AND ppc.estado = 'Asignado'
    `, [ppcId, instalacionId]);

    if (ppcCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'PPC no encontrado o no está asignado' },
        { status: 404 }
      );
    }

    const ppc = ppcCheck.rows[0];

    // Terminar la asignación activa del guardia
    if (ppc.guardia_asignado_id) {
      await query(`
        UPDATE as_turnos_asignaciones 
        SET 
          estado = 'Finalizada',
          fecha_termino = CURRENT_DATE,
          motivo_termino = 'Desasignación desde PPC'
        WHERE guardia_id = $1 
          AND requisito_puesto_id = $2 
          AND estado = 'Activa'
      `, [ppc.guardia_asignado_id, ppc.requisito_puesto_id]);
    }

    // Marcar PPC como pendiente nuevamente
    const result = await query(`
      UPDATE as_turnos_ppc 
      SET 
        estado = 'Pendiente',
        guardia_asignado_id = NULL,
        fecha_asignacion = NULL,
        observaciones = CONCAT(COALESCE(observaciones, ''), ' - Desasignado: ', now())
      WHERE id = $1
      RETURNING *
    `, [ppcId]);

    return NextResponse.json({
      success: true,
      message: 'Guardia desasignado correctamente',
      ppc: result.rows[0]
    });

  } catch (error) {
    console.error('Error desasignando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 