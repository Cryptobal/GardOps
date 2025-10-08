import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; ppcId: string } }
) {
  try {
    const { id: instalacionId, ppcId } = params;
    
    // Obtener información del usuario que está realizando la acción
    const userInfo = getCurrentUserServer(request);
    const userId = userInfo?.id || null;

    // Verificar que el puesto operativo existe y pertenece a esta instalación
    const puestoCheck = await query(`
      SELECT id, instalacion_id, rol_id, guardia_id, nombre_puesto, es_ppc, activo
      FROM as_turnos_puestos_operativos
      WHERE id = $1 AND instalacion_id = $2
    `, [ppcId, instalacionId]);

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado' },
        { status: 404 }
      );
    }

    const puesto = puestoCheck.rows[0];

    // VALIDACIÓN: Verificar si tiene guardia asignado actualmente
    if (puesto.guardia_id !== null) {
      logger.debug('❌ No se puede eliminar: puesto tiene guardia asignado', {
        puesto_id: ppcId,
        guardia_id: puesto.guardia_id,
        nombre_puesto: puesto.nombre_puesto
      });
      
      return NextResponse.json(
        { 
          error: 'No se puede eliminar un puesto con guardia asignado',
          mensaje: 'Primero debes desasignar al guardia antes de eliminar este puesto operativo',
          tieneGuardiaAsignado: true
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Verificar si tiene historial operativo (registros en pauta diaria/mensual)
    const historialCheck = await query(`
      SELECT COUNT(*) as registros
      FROM as_turnos_pauta_mensual
      WHERE puesto_id = $1
    `, [ppcId]);

    const tieneHistorial = historialCheck.rows[0].registros > 0;

    // Iniciar transacción
    await query('BEGIN');

    try {
      let resultado = {
        fueEliminado: false,
        fueInactivado: false,
        mensaje: ''
      };

      if (!tieneHistorial) {
        // Eliminar definitivamente si no tiene historial
        await query(`
          DELETE FROM as_turnos_puestos_operativos 
          WHERE id = $1
        `, [ppcId]);

        resultado = {
          fueEliminado: true,
          fueInactivado: false,
          mensaje: '✅ Puesto eliminado correctamente'
        };
      } else {
        // Inactivar si tiene historial en pautas
        await query(`
          UPDATE as_turnos_puestos_operativos 
          SET activo = false, 
              eliminado_en = NOW(),
              eliminado_por = $2
          WHERE id = $1
        `, [ppcId, userId]);

        resultado = {
          fueEliminado: false,
          fueInactivado: true,
          mensaje: '⚠️ Puesto inactivado porque tiene historial en pautas'
        };
      }

      await query('COMMIT');

      // Log para debugging
      logger.debug("🔍 Resultado eliminación de puesto", {
        puesto_id: ppcId,
        fueEliminado: resultado.fueEliminado,
        fueInactivado: resultado.fueInactivado,
        tieneHistorial,
        guardia_asignada,
        usuario_id: userId
      });

      return NextResponse.json({
        success: true,
        ...resultado
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    logger.error('Error eliminando puesto operativo::', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 