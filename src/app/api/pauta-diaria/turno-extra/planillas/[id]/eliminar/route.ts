import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('🔍 Iniciando DELETE /api/pauta-diaria/turno-extra/planillas/[id]/eliminar');
    
    const user = getCurrentUserServer(request);
    if (!user) {
      logger.debug('❌ Usuario no autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const planillaId = parseInt(params.id);
    if (!planillaId || isNaN(planillaId)) {
      return NextResponse.json({ error: 'ID de planilla inválido' }, { status: 400 });
    }

    devLogger.search(' Eliminando planilla ID:', planillaId);

    // Verificar que la planilla existe
    const { rows: planillaExists } = await query(
      'SELECT id, codigo, estado FROM te_planillas_turnos_extras WHERE id = $1',
      [planillaId]
    );

    if (planillaExists.length === 0) {
      return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
    }

    const planilla = planillaExists[0];
    devLogger.search(' Planilla encontrada:', planilla);

    // Verificar que la planilla no esté pagada
    if (planilla.estado === 'pagada') {
      return NextResponse.json({ 
        error: 'No se puede eliminar una planilla que ya ha sido pagada' 
      }, { status: 400 });
    }

    // Obtener los turnos asociados a esta planilla
    const { rows: turnos } = await query(
      'SELECT id, guardia_id, instalacion_id, puesto_id, fecha, estado, valor FROM te_turnos_extras WHERE planilla_id = $1',
      [planillaId]
    );

    devLogger.search(' Turnos asociados encontrados:', turnos.length);

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Liberar los turnos (quitar planilla_id y resetear pagado)
      if (turnos.length > 0) {
        await query(
          'UPDATE te_turnos_extras SET planilla_id = NULL, pagado = FALSE, fecha_pago = NULL, observaciones_pago = NULL, usuario_pago = NULL WHERE planilla_id = $1',
          [planillaId]
        );
        logger.debug('✅ Turnos liberados');
      }

      // Eliminar la planilla
      await query(
        'DELETE FROM te_planillas_turnos_extras WHERE id = $1',
        [planillaId]
      );
      logger.debug('✅ Planilla eliminada');

      await query('COMMIT');

      return NextResponse.json({
        mensaje: `Planilla ${planilla.codigo} eliminada exitosamente`,
        turnos_liberados: turnos.length,
        planilla_codigo: planilla.codigo
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error eliminando planilla:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
