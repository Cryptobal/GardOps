import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sincronizarPautasPostAsignacion } from '@/lib/sync-pautas';
import { terminarAsignacionActual } from '@/lib/historial-asignaciones';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; ppcId: string } }
) {
  logger.debug("🔁 Endpoint activo: /api/instalaciones/[id]/ppc/[ppcId]/desasignar_v2");
  
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

    console.log('🔍 [DESASIGNAR] Iniciando desasignación:', {
      guardiaId,
      ppcId,
      instalacionId
    });

    // 1. Terminar asignación en historial (NUEVO SISTEMA) - FECHA LOCAL CHILE
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaTermino = `${año}-${mes}-${dia}`;
    
    console.log('🔍 [DESASIGNAR] Fecha de término calculada:', {
      fechaTermino,
      fechaActual: hoy.toLocaleDateString('es-CL')
    });
    
    const resultadoHistorial = await terminarAsignacionActual(
      guardiaId,
      fechaTermino,
      'desasignacion_manual',
      'Desasignado desde instalaciones'
    );
    
    if (resultadoHistorial.success) {
      console.log('✅ [DESASIGNAR] Historial actualizado con fecha de término');
    } else {
      console.warn('⚠️ [DESASIGNAR] No se pudo actualizar historial:', resultadoHistorial.error);
    }

    // 2. Liberar puesto operativo (LÓGICA LEGACY - SIN TRANSACCIÓN)
    const result = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET es_ppc = true,
          guardia_id = NULL,
          actualizado_en = NOW()
      WHERE id = $1
      RETURNING *
    `, [ppcId]);
    
    console.log('✅ [DESASIGNAR] Puesto liberado correctamente');

    logger.debug(`✅ Guardia ${guardiaId} desasignado del puesto ${ppcId} correctamente`);

    // SIMPLIFICADO: Sin sincronización por ahora para evitar errores
    console.log('✅ [DESASIGNAR] Desasignación completada sin sincronización');

    return NextResponse.json({
      success: true,
      message: 'Guardia desasignado correctamente',
      puesto: result.rows[0]
    });

  } catch (error) {
    logger.error('Error desasignando guardia específico v2::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 