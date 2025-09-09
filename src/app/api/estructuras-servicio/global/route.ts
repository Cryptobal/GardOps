import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET() {
  try {
    const result = await query(`
      WITH base AS (
        SELECT 
          es.*,
          i.nombre AS instalacion_nombre,
          rs.nombre AS rol_nombre,
          CONCAT(
            rs.nombre, ' - ',
            rs.dias_trabajo, 'x', rs.dias_descanso,
            CASE 
              WHEN rs.hora_inicio IS NOT NULL AND rs.hora_termino IS NOT NULL 
              THEN CONCAT(' / ', rs.hora_inicio, '-', rs.hora_termino)
              ELSE ''
            END
          ) AS rol_completo,
          ROW_NUMBER() OVER (
            PARTITION BY es.instalacion_id, es.rol_servicio_id
            ORDER BY es.updated_at DESC, es.created_at DESC
          ) AS rn
        FROM sueldo_estructuras_servicio es
        INNER JOIN instalaciones i ON es.instalacion_id = i.id
        INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
        WHERE es.bono_id IS NULL
      ),
      guardias_asignados AS (
        SELECT 
          po.instalacion_id,
          po.rol_id,
          COUNT(*)::int AS guardias_asignados
        FROM as_turnos_puestos_operativos po
        WHERE po.guardia_id IS NOT NULL 
          AND po.es_ppc = false 
          AND po.activo = true
        GROUP BY po.instalacion_id, po.rol_id
      ),
      bonos AS (
        SELECT 
          es.instalacion_id,
          es.rol_servicio_id,
          json_agg(
            json_build_object(
              'id', b.id,
              'nombre', b.nombre,
              'monto', es.monto,
              'imponible', b.imponible
            ) ORDER BY b.nombre
          ) AS bonos
        FROM sueldo_estructuras_servicio es
        INNER JOIN sueldo_bonos_globales b ON es.bono_id = b.id
        GROUP BY es.instalacion_id, es.rol_servicio_id
      ),
      historial AS (
        SELECT 
          estructura_id,
          json_agg(
            json_build_object(
              'fecha', fecha_accion,
              'accion', accion,
              'detalles', detalles,
              'datos_anteriores', datos_anteriores,
              'datos_nuevos', datos_nuevos
            ) ORDER BY fecha_accion DESC
          ) AS historial
        FROM sueldo_historial_estructuras
        GROUP BY estructura_id
      )
      SELECT 
        eb.*,
        COALESCE(ga.guardias_asignados, 0) AS guardias_asignados,
        COALESCE(b.bonos, '[]'::json) AS bonos,
        COALESCE(h.historial, '[]'::json) AS historial
      FROM base eb
      LEFT JOIN guardias_asignados ga
        ON ga.instalacion_id = eb.instalacion_id
       AND ga.rol_id = eb.rol_servicio_id
      LEFT JOIN bonos b 
        ON eb.instalacion_id = b.instalacion_id 
       AND eb.rol_servicio_id = b.rol_servicio_id
      LEFT JOIN historial h ON eb.id = h.estructura_id
      WHERE eb.rn = 1
      ORDER BY eb.instalacion_nombre, eb.rol_nombre, eb.created_at DESC;
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Error obteniendo estructuras::', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo estructuras' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id, rol_servicio_id, activo, usuario_id } = body;

    if (!instalacion_id || !rol_servicio_id) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Obtener estructura actual
      const estructuraActual = await query(`
        SELECT * FROM sueldo_estructuras_servicio
        WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND bono_id IS NULL
        ORDER BY created_at DESC LIMIT 1
      `, [instalacion_id, rol_servicio_id]);

      if (estructuraActual.rows.length === 0) {
        throw new Error('Estructura no encontrada');
      }

      const estructura = estructuraActual.rows[0];

      // Actualizar estado y fecha de inactivación
      await query(`
        UPDATE sueldo_estructuras_servicio
        SET 
          activo = $1,
          fecha_inactivacion = CASE 
            WHEN $1 = false THEN CURRENT_TIMESTAMP
            ELSE NULL
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [activo, estructura.id]);

      // Registrar en historial
      await query(`
        INSERT INTO sueldo_historial_estructuras (
          rol_servicio_id,
          estructura_id,
          accion,
          fecha_accion,
          detalles,
          usuario_id,
          datos_anteriores,
          datos_nuevos
        ) VALUES (
          $1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7
        )
      `, [
        estructura.rol_servicio_id,
        estructura.id,
        activo ? 'ACTIVACION' : 'INACTIVACION',
        activo ? 'Estructura reactivada' : 'Estructura inactivada',
        usuario_id,
        { activo: estructura.activo },
        { activo: activo }
      ]);

      await query('COMMIT');

      return NextResponse.json({ 
        success: true, 
        message: `Estructura ${activo ? 'activada' : 'inactivada'} correctamente` 
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error actualizando estructura::', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error actualizando estructura' 
      },
      { status: 500 }
    );
  }
}