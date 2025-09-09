import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    logger.debug('🔍 Iniciando proceso de activación...');
    const body = await request.json();
    const { rolId, instalacionId, motivo = 'Activación manual' } = body;

    devLogger.search(' Datos recibidos:', { rolId, motivo });

    if (!rolId) {
      logger.debug('❌ Error: rolId no proporcionado');
      return NextResponse.json(
        { success: false, error: 'El rolId es requerido' },
        { status: 400 }
      );
    }
    if (!instalacionId) {
      logger.debug('❌ Error: instalacionId no proporcionado');
      return NextResponse.json(
        { success: false, error: 'El instalacionId es requerido' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    await query('BEGIN');

    try {
      // 1. Verificar que el rol existe (no cambiamos estado global)
      const resultRol = await query(
        `SELECT id, nombre FROM as_turnos_roles_servicio WHERE id = $1 LIMIT 1`,
        [rolId]
      );

      if (resultRol.rowCount === 0) {
        await query('ROLLBACK');
        logger.debug('❌ Error: Rol de servicio no encontrado');
        return NextResponse.json(
          { success: false, error: 'Rol de servicio no encontrado' },
          { status: 404 }
        );
      }

      logger.debug('🔍 Activando estructuras de servicio SOLO en la instalación indicada...');
      // 2. Activar las estructuras de sueldo asociadas del rol en esa instalación
      const resultEstructura = await query(`
        UPDATE sueldo_estructuras_servicio 
        SET activo = true, fecha_inactivacion = NULL, updated_at = NOW()
        WHERE rol_servicio_id = $1 AND instalacion_id = $2
        RETURNING id, rol_servicio_id, sueldo_base, activo
      `, [rolId, instalacionId]);

      logger.debug('🔍 Registrando en historial...');
      // 3. Crear registro en historial
      await query(`
        INSERT INTO sueldo_historial_roles (
          rol_servicio_id, 
          accion, 
          fecha_accion,
          detalles,
          datos_anteriores,
          datos_nuevos
        ) VALUES ($1, $2, NOW(), $3, $4, $5)
      `, [
        rolId,
        'REACTIVACION',
        motivo,
        JSON.stringify({
          rol: resultRol.rows[0],
          instalacion_id: instalacionId,
          estructuras_activadas: resultEstructura.rows.length
        }),
        JSON.stringify({
          rol_estado: 'Inactivo',
          estructuras_activas: 0
        })
      ]);

      await query('COMMIT');

      logger.debug('✅ Activación completada exitosamente');
      return NextResponse.json({
        success: true,
        message: 'Rol activado correctamente',
        data: {
          rol: resultRol.rows[0],
          estructuras_activadas: resultEstructura.rows.length
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      console.error('❌ Error en activación:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ Error al activar rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
