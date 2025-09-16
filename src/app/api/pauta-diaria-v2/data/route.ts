import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getHoyChile } from '@/lib/utils/chile-date';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || await getHoyChile();
    const incluirLibres = searchParams.get('incluirLibres') === 'true';

    logger.debug(`🔍 Obteniendo datos de pauta diaria para fecha: ${fecha}, incluirLibres: ${incluirLibres}`);
    
    // Construir la consulta base con comentarios y mapeo correcto de campos
    const { rows } = await sql`
      SELECT 
        pd.pauta_id,
        pd.fecha,
        pd.puesto_id,
        pd.nombre_puesto as puesto_nombre,
        pd.instalacion_id,
        pd.instalacion_nombre,
        pd.estado_pauta_mensual as estado,
        pd.estado_ui,
        pd.meta,
        pd.guardia_trabajo_id,
        pd.guardia_nombre as guardia_trabajo_nombre,
        pd.guardia_id as guardia_titular_id,
        pd.guardia_nombre as guardia_titular_nombre,
        pd.es_ppc,
        pd.rol_id,
        pd.rol_nombre,
        pd.hora_inicio,
        pd.hora_termino as hora_fin,
        pd.guardia_telefono as guardia_titular_telefono,
        pd.cobertura_guardia_id,
        pd.cobertura_estado,
        pd.cobertura_fecha,
        -- CAMPOS FALTANTES PARA LÓGICA DE BOTONES
        pm.tipo_turno,
        pm.estado_puesto,
        pm.estado_guardia,
        pm.tipo_cobertura,
        pm.horas_extras,
        tc.comentario,
        tc.updated_at as comentario_updated_at,
        tc.usuario_id as comentario_usuario_id,
        -- NOMBRE DEL GUARDIA DE COBERTURA
        CASE 
          WHEN pm.meta->>'cobertura_guardia_id' IS NOT NULL THEN
            CONCAT(gc.nombre, ' ', COALESCE(gc.apellido_paterno, ''), ' ', COALESCE(gc.apellido_materno, ''))
          ELSE NULL
        END as cobertura_guardia_nombre
      FROM as_turnos_v_pauta_diaria_unificada pd
      LEFT JOIN as_turnos_pauta_mensual pm ON pd.pauta_id = pm.id
      LEFT JOIN as_turnos_comentarios tc ON (
        pd.pauta_id::integer = tc.turno_id 
        AND pd.fecha::date = tc.fecha
      )
      LEFT JOIN guardias gc ON gc.id = (pm.meta->>'cobertura_guardia_id')::uuid
      WHERE pd.fecha = ${fecha}
      ORDER BY pd.es_ppc DESC, pd.instalacion_nombre NULLS LAST, pd.puesto_id, pd.pauta_id DESC
    `;
    
    logger.debug(`✅ Datos obtenidos exitosamente: ${rows.length} registros`);
    
    return NextResponse.json({
      success: true,
      data: rows,
      fecha,
      total: rows.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo datos de pauta diaria:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
