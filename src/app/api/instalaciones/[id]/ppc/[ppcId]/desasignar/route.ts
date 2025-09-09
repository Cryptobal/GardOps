import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; ppcId: string } }
) {
  logger.debug("🔁 Endpoint activo: /api/instalaciones/[id]/ppc/[ppcId]/desasignar");
  
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

    // Ejecutar desasignación con transacción para garantizar consistencia
    await query('BEGIN');
    
    try {
      logger.debug(`🔄 [DESASIGNACIÓN] Iniciando desasignación del guardia ${ppc.guardia_id} del puesto ${ppcId}`);

      // Marcar puesto como PPC nuevamente
      const result = await query(`
        UPDATE as_turnos_puestos_operativos 
        SET 
          es_ppc = true,
          guardia_id = NULL,
          actualizado_en = NOW(),
          observaciones = CONCAT(COALESCE(observaciones, ''), ' - Desasignado: ', NOW())
        WHERE id = $1
        RETURNING *
      `, [ppcId]);

      logger.debug(`✅ [DESASIGNACIÓN] Puesto ${ppcId} convertido a PPC exitosamente`);

      // Confirmar transacción
      await query('COMMIT');
      logger.debug(`✅ [TRANSACCIÓN] Desasignación completada exitosamente`);

      return NextResponse.json({
        success: true,
        message: 'Guardia desasignado correctamente',
        ppc: result.rows[0]
      });
      
    } catch (transactionError) {
      // Revertir cambios en caso de error
      await query('ROLLBACK');
      console.error(`❌ [TRANSACCIÓN] Error en desasignación, cambios revertidos:`, transactionError);
      throw transactionError;
    }

  } catch (error) {
    logger.error('Error desasignando guardia::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 