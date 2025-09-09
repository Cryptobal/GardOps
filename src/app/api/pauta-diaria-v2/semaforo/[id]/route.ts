import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { estado, observaciones, operador_id } = await request.json();
    const pautaId = params.id;

    // Validar estado - nuevos estados para monitoreo en tiempo real
    const estadosValidos = [
      'pendiente', 
      'en_camino', 
      'no_contesta', 
      'no_ira', 
      'llego',
      'retrasado',
      'en_transito'
    ];
    
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Obtener datos actuales de la pauta
    const pautaActual = await pool.query(
      `SELECT 
        pm.id,
        pm.meta,
        g.nombre as guardia_nombre,
        g.telefono as guardia_telefono,
        i.nombre as instalacion_nombre,
        rs.hora_inicio,
        rs.hora_termino
       FROM as_turnos_pauta_mensual pm
       LEFT JOIN guardias g ON pm.guardia_id = g.id
       LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
       LEFT JOIN instalaciones i ON po.instalacion_id = i.id
       LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
       WHERE pm.id = $1`,
      [pautaId]
    );

    if (pautaActual.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pauta no encontrada' },
        { status: 404 }
      );
    }

    const pauta = pautaActual.rows[0];
    const metaActual = pauta.meta || {};
    
    // Actualizar el estado del semáforo y agregar timestamp
    const nuevaMeta = {
      ...metaActual,
      estado_semaforo: estado,
      ultima_actualizacion_semaforo: new Date().toISOString(),
      operador_semaforo: operador_id || null,
      observaciones_semaforo: observaciones || null
    };

    // Actualizar el estado del semáforo en la base de datos
    const result = await pool.query(
      `UPDATE as_turnos_pauta_mensual 
       SET meta = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, meta`,
      [JSON.stringify(nuevaMeta), pautaId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Error al actualizar la pauta' },
        { status: 500 }
      );
    }

    // Crear log de auditoría
    await pool.query(
      `INSERT INTO logs (
        fecha, hora, accion, entidad_tipo, entidad_id, 
        usuario_id, datos_anteriores, datos_nuevos, contexto
      ) VALUES (
        CURRENT_DATE, CURRENT_TIME, 'UPDATE', 'semaforo', $1,
        $2, $3, $4, $5
      )`,
      [
        pautaId,
        operador_id,
        JSON.stringify(metaActual),
        JSON.stringify(nuevaMeta),
        `Cambio de estado de semáforo a: ${estado}`
      ]
    );

    return NextResponse.json({ 
      success: true, 
      estado,
      pauta_id: pautaId,
      meta: nuevaMeta,
      guardia_nombre: pauta.guardia_nombre,
      instalacion_nombre: pauta.instalacion_nombre,
      hora_inicio: pauta.hora_inicio,
      hora_termino: pauta.hora_termino
    });

  } catch (error) {
    logger.error('Error actualizando estado del semáforo::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET para obtener el estado actual del semáforo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pautaId = params.id;

    const result = await pool.query(
      `SELECT 
        pm.id,
        pm.meta->>'estado_semaforo' as estado_semaforo,
        pm.meta->>'observaciones_semaforo' as observaciones_semaforo,
        pm.meta->>'ultima_actualizacion_semaforo' as ultima_actualizacion,
        g.nombre as guardia_nombre,
        g.telefono as guardia_telefono,
        i.nombre as instalacion_nombre,
        rs.hora_inicio,
        rs.hora_termino
       FROM as_turnos_pauta_mensual pm
       LEFT JOIN guardias g ON pm.guardia_id = g.id
       LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
       LEFT JOIN instalaciones i ON po.instalacion_id = i.id
       LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
       WHERE pm.id = $1`,
      [pautaId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pauta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error obteniendo estado del semáforo::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
