import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { observaciones } = await request.json();
    const pautaId = params.id;

    // Obtener datos actuales de la pauta
    const pautaActual = await pool.query(
      `SELECT 
        pm.id,
        pm.meta,
        g.nombre as guardia_nombre,
        i.nombre as instalacion_nombre
       FROM as_turnos_pauta_mensual pm
       LEFT JOIN guardias g ON pm.guardia_id = g.id
       LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
       LEFT JOIN instalaciones i ON po.instalacion_id = i.id
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
    
    // Actualizar solo las observaciones
    const nuevaMeta = {
      ...metaActual,
      observaciones_semaforo: observaciones,
      ultima_actualizacion_semaforo: new Date().toISOString()
    };

    // Actualizar las observaciones en la base de datos
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

    return NextResponse.json({ 
      success: true, 
      observaciones,
      pauta_id: pautaId,
      guardia_nombre: pauta.guardia_nombre,
      instalacion_nombre: pauta.instalacion_nombre
    });

  } catch (error) {
    logger.error('Error actualizando observaciones::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pautaId = params.id;

    const result = await pool.query(
      `SELECT 
        pm.id,
        pm.meta->>'observaciones_semaforo' as observaciones,
        pm.meta->>'ultima_actualizacion_semaforo' as ultima_actualizacion,
        g.nombre as guardia_nombre,
        i.nombre as instalacion_nombre
       FROM as_turnos_pauta_mensual pm
       LEFT JOIN guardias g ON pm.guardia_id = g.id
       LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
       LEFT JOIN instalaciones i ON po.instalacion_id = i.id
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
    logger.error('Error obteniendo observaciones::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
