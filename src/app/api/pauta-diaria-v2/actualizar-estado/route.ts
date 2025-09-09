import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const { pauta_id, estado_semaforo, fecha } = await request.json();

    if (!pauta_id || !estado_semaforo) {
      return NextResponse.json({
        success: false,
        error: 'pauta_id y estado_semaforo son requeridos'
      }, { status: 400 });
    }

    logger.debug(`🔧 Actualizando estado de pauta ${pauta_id} a ${estado_semaforo}`);

    // Actualizar el estado en la tabla as_turnos_pauta_mensual
    // Corregido: una sola operación jsonb_set con múltiples campos
    const query = `
      UPDATE as_turnos_pauta_mensual 
      SET meta = jsonb_set(
        jsonb_set(
          COALESCE(meta, '{}'::jsonb), 
          '{estado_semaforo}', 
          $1::jsonb
        ),
        '{ultima_actualizacion_semaforo}', 
        $2::jsonb
      )
      WHERE id = $3
    `;

    const now = new Date().toISOString();
    const estadoJson = JSON.stringify(estado_semaforo);
    const timestampJson = JSON.stringify(now);

    const result = await pool.query(query, [estadoJson, timestampJson, pauta_id]);

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró la pauta especificada'
      }, { status: 404 });
    }

    logger.debug(`✅ Estado actualizado exitosamente: ${pauta_id} -> ${estado_semaforo}`);

    return NextResponse.json({
      success: true,
      message: 'Estado actualizado correctamente',
      data: {
        pauta_id,
        estado_semaforo,
        ultima_actualizacion: now
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
