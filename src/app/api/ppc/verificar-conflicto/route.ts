import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { puesto_operativo_id, fecha_inicio } = await request.json();

    if (!puesto_operativo_id || !fecha_inicio) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros requeridos'
      }, { status: 400 });
    }

    logger.debug('🔍 Verificando conflicto de asignación:', {
      puesto_operativo_id,
      fecha_inicio
    });

    // Verificar si el puesto ya está asignado a otro guardia desde la fecha indicada
    const { rows } = await pool.query(`
      SELECT 
        h.guardia_id,
        g.nombre,
        g.apellido_paterno,
        h.fecha_inicio,
        h.fecha_termino as fecha_fin,
        h.estado,
        po.nombre_puesto,
        i.nombre as instalacion_nombre
      FROM historial_asignaciones_guardias h
      INNER JOIN guardias g ON h.guardia_id = g.id
      INNER JOIN as_turnos_puestos_operativos po ON h.puesto_id = po.id
      INNER JOIN instalaciones i ON h.instalacion_id = i.id
      WHERE h.puesto_id = $1
        AND h.estado = 'activa'
        AND (
          h.fecha_termino IS NULL 
          OR h.fecha_termino >= $2
        )
        AND h.fecha_inicio <= $2
      ORDER BY h.fecha_inicio DESC
      LIMIT 1
    `, [puesto_operativo_id, fecha_inicio]);

    const conflicto = rows.length > 0 ? rows[0] : null;

    logger.debug('🔍 Resultado verificación conflicto:', {
      tieneConflicto: !!conflicto,
      conflicto: conflicto ? {
        guardia: `${conflicto.nombre} ${conflicto.apellido_paterno}`,
        fecha_inicio: conflicto.fecha_inicio,
        fecha_fin: conflicto.fecha_fin,
        puesto: conflicto.nombre_puesto,
        instalacion: conflicto.instalacion_nombre
      } : null
    });

    return NextResponse.json({
      success: true,
      data: {
        tieneConflicto: !!conflicto,
        conflicto: conflicto ? {
          guardia_id: conflicto.guardia_id,
          guardia_nombre: `${conflicto.nombre} ${conflicto.apellido_paterno}`,
          fecha_inicio: conflicto.fecha_inicio,
          fecha_fin: conflicto.fecha_fin,
          puesto_nombre: conflicto.nombre_puesto,
          instalacion_nombre: conflicto.instalacion_nombre
        } : null
      }
    });

  } catch (error) {
    logger.error('❌ Error verificando conflicto de asignación:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
