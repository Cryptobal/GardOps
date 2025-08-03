import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// POST: Desasignar guardia de un PPC usando el nuevo modelo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/ppc/desasignar_v2");
  
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
      SELECT po.id, po.guardia_id, po.es_ppc, po.rol_id
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

    // Finalizar asignación activa del guardia en as_turnos_asignaciones
    await query(`
      UPDATE as_turnos_asignaciones
      SET estado = 'Finalizada',
          fecha_termino = CURRENT_DATE,
          motivo_termino = 'Desasignación manual v2',
          observaciones = CONCAT(COALESCE(observaciones, ''), ' - Desasignado: ', now()),
          updated_at = NOW()
      WHERE guardia_id = $1 AND puesto_operativo_id = $2 AND estado = 'Activa'
    `, [guardiaId, puesto_operativo_id]);

    // Marcar puesto como PPC nuevamente en as_turnos_puestos_operativos
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

    return NextResponse.json({
      success: true,
      message: 'Guardia desasignado correctamente',
      puesto: result.rows[0]
    });
  } catch (error) {
    console.error('Error desasignando guardia v2:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 