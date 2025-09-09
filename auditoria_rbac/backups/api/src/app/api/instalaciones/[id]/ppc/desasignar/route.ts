import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// POST: Desasignar guardia de un PPC
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/ppc/desasignar");
  
  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { puesto_operativo_id } = body;

    if (!puesto_operativo_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el puesto operativo existe y pertenece a esta instalación
    const puestoCheck = await query(`
      SELECT po.id, po.guardia_id, po.es_ppc
      FROM as_turnos_puestos_operativos po
      WHERE po.id = $1 AND po.instalacion_id = $2
    `, [puesto_operativo_id, instalacionId]);

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado' },
        { status: 404 }
      );
    }

    const puestoData = puestoCheck.rows[0];
    const guardiaId = puestoData.guardia_id;

    if (!guardiaId) {
      return NextResponse.json(
        { error: 'El puesto no tiene un guardia asignado' },
        { status: 400 }
      );
    }

    // Finalizar asignación activa del guardia
    // Migrado al nuevo modelo as_turnos_puestos_operativos
    const finalizarAsignacion = await query(`
      UPDATE as_turnos_puestos_operativos
      SET es_ppc = true,
          guardia_id = NULL,
          actualizado_en = CURRENT_DATE,
          observaciones = CONCAT(COALESCE(observaciones, ''), ' - Desasignado: ', now())
      WHERE guardia_id = $1 AND id = $2 AND es_ppc = false
    `, [guardiaId, puesto_operativo_id]);

    // Marcar puesto como PPC nuevamente
    const result = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET es_ppc = true,
          guardia_id = NULL,
          fecha_asignacion = NULL,
          observaciones = CONCAT(COALESCE(observaciones, ''), ' - Desasignado guardia: ', now()),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [puesto_operativo_id]);

    console.log(`✅ Guardia ${guardiaId} desasignado del puesto ${puesto_operativo_id} correctamente`);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error desasignando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 