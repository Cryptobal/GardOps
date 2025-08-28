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
    // Migrado al nuevo modelo as_turnos_puestos_operativos
    const ppcCheck = await query(`
      SELECT 
        po.id,
        po.guardia_id,
        po.rol_id,
        po.instalacion_id
      FROM as_turnos_puestos_operativos po
      WHERE po.id = $1 AND po.instalacion_id = $2 AND po.es_ppc = false
    `, [ppcId, instalacionId]);

    if (ppcCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado o no está asignado' },
        { status: 404 }
      );
    }

    const ppc = ppcCheck.rows[0];

    // Terminar la asignación activa del guardia
    if (ppc.guardia_id) {
      await query(`
        UPDATE as_turnos_puestos_operativos 
        SET 
          es_ppc = true,
          guardia_id = NULL,
          actualizado_en = CURRENT_DATE,
          observaciones = CONCAT(COALESCE(observaciones, ''), ' - Desasignado desde PPC: ', now())
        WHERE guardia_id = $1 
          AND id = $2 
          AND es_ppc = false
      `, [ppc.guardia_id, ppcId]);
    }

    // Marcar puesto como PPC nuevamente
    const result = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET 
        es_ppc = true,
        guardia_id = NULL,
        actualizado_en = CURRENT_DATE,
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