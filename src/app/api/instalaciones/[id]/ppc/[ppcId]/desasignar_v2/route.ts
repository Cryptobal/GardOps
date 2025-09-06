import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sincronizarPautasPostAsignacion } from '@/lib/sync-pautas';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; ppcId: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2");
  
  try {
    const instalacionId = params.id;
    const ppcId = params.ppcId;

    // Verificar que el puesto operativo existe y pertenece a esta instalación
    const puestoCheck = await query(`
      SELECT po.id, po.guardia_id, po.es_ppc, po.rol_id
      FROM as_turnos_puestos_operativos po
      WHERE po.id = $1 AND po.instalacion_id = $2
    `, [ppcId, instalacionId]);

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
    await query(`
      UPDATE as_turnos_puestos_operativos
      SET es_ppc = true,
          guardia_id = NULL,
          actualizado_en = CURRENT_DATE,
          observaciones = CONCAT(COALESCE(observaciones, ''), ' - Desasignado: ', now())
      WHERE guardia_id = $1 AND id = $2 AND es_ppc = false
    `, [guardiaId, ppcId]);

    // Marcar puesto como PPC nuevamente en as_turnos_puestos_operativos
    const result = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET es_ppc = true,
          guardia_id = NULL
      WHERE id = $1
      RETURNING *
    `, [ppcId]);

    console.log(`✅ Guardia ${guardiaId} desasignado del puesto ${ppcId} correctamente`);

    // NUEVA FUNCIONALIDAD: Sincronizar pautas después de la desasignación
    console.log(`🔄 [SYNC] Iniciando sincronización de pautas después de desasignación...`);
    console.log(`🔍 [SYNC] Datos para sincronización:`, {
      ppcId,
      guardiaId: null,
      instalacionId,
      rolId: puestoData.rol_id
    });
    
    const syncResult = await sincronizarPautasPostAsignacion(
      ppcId,
      null, // guardia_id = null para desasignación
      instalacionId,
      puestoData.rol_id
    );

    console.log(`🔍 [SYNC] Resultado de sincronización:`, syncResult);

    if (!syncResult.success) {
      console.error(`❌ [SYNC] Error en sincronización:`, syncResult.error);
      // NO fallar la desasignación principal por error de sincronización
      console.warn(`⚠️ [SYNC] Desasignación completada pero sincronización falló: ${syncResult.error}`);
    } else {
      console.log(`✅ [SYNC] Pautas sincronizadas exitosamente - visible en Pauta Diaria`);
    }

    return NextResponse.json({
      success: true,
      message: 'Guardia desasignado correctamente',
      puesto: result.rows[0]
    });

  } catch (error) {
    console.error('Error desasignando guardia específico v2:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 