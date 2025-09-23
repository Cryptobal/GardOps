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
    
    // Debug: verificar si hay turnos extra para esta fecha
    try {
      const { rows: debugRows } = await sql`
        SELECT id, puesto_id, tipo_cobertura, guardia_trabajo_id, estado_puesto
        FROM as_turnos_pauta_mensual 
        WHERE make_date(anio, mes, dia) = ${fecha}::date
          AND tipo_cobertura = 'turno_extra'
      `;
      
      console.log('🔍 TURNOS EXTRA EN BD para', fecha, ':', debugRows);
    } catch (debugError) {
      console.warn('⚠️ Error en consulta de debug:', debugError);
    }
    
    // Construir la consulta base usando directamente la tabla as_turnos_pauta_mensual
    const { rows } = await sql`
      SELECT 
        pm.id as pauta_id,
        make_date(pm.anio, pm.mes, pm.dia) as fecha,
        pm.puesto_id,
        p.nombre_puesto as puesto_nombre,
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        -- Mapear estado correctamente usando nueva estructura
        CASE 
          WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia IS NULL THEN 'planificado'
          WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'asistido' THEN 'asistido'
          WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'falta' AND pm.tipo_cobertura = 'turno_extra' THEN 'reemplazo'
          WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'falta' AND pm.tipo_cobertura = 'sin_cobertura' THEN 'sin_cobertura'
          WHEN pm.estado_puesto = 'ppc' AND pm.tipo_cobertura = 'sin_cobertura' THEN 'sin_cobertura'
          WHEN pm.estado_puesto = 'ppc' AND pm.tipo_cobertura = 'turno_extra' THEN 'reemplazo'
          WHEN pm.estado_puesto = 'ppc' AND pm.tipo_cobertura = 'ppc' THEN 'planificado'
          WHEN pm.estado_puesto = 'libre' THEN 'libre'
          ELSE 'planificado'
        END as estado,
        -- Mapear estado_ui para la interfaz
        CASE 
          WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia IS NULL THEN 'plan'
          WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'asistido' THEN 'asistido'
          WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'falta' AND pm.tipo_cobertura = 'turno_extra' THEN 'reemplazo'
          WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'falta' AND pm.tipo_cobertura = 'sin_cobertura' THEN 'sin_cobertura'
          WHEN pm.estado_puesto = 'ppc' AND pm.tipo_cobertura = 'sin_cobertura' THEN 'sin_cobertura'
          WHEN pm.estado_puesto = 'ppc' AND pm.tipo_cobertura = 'turno_extra' THEN 'te'
          WHEN pm.estado_puesto = 'ppc' AND pm.tipo_cobertura = 'ppc' THEN 'plan'
          WHEN pm.estado_puesto = 'libre' THEN 'libre'
          ELSE 'plan'
        END as estado_ui,
        pm.meta,
        pm.guardia_trabajo_id,
        -- NOMBRE DEL GUARDIA TITULAR (siempre el titular, no quien trabaja)
        CONCAT(gt.nombre, ' ', COALESCE(gt.apellido_paterno, ''), ' ', COALESCE(gt.apellido_materno, '')) as guardia_titular_nombre,
        pm.guardia_id as guardia_titular_id,
        CASE WHEN pm.estado_puesto = 'ppc' THEN true ELSE false END as es_ppc,
        r.id as rol_id,
        r.nombre as rol_nombre,
        r.hora_inicio,
        r.hora_termino,
        gt.telefono as guardia_titular_telefono,
        CASE 
          WHEN pm.guardia_trabajo_id IS NOT NULL AND (
            pm.guardia_trabajo_id != pm.guardia_id OR 
            pm.guardia_id IS NULL OR
            pm.tipo_cobertura = 'turno_extra'
          ) THEN
            pm.guardia_trabajo_id
          ELSE NULL
        END as cobertura_guardia_id,
        pm.estado_guardia as cobertura_estado,
        pm.updated_at as cobertura_fecha,
        -- CAMPOS FALTANTES PARA LÓGICA DE BOTONES
        pm.tipo_turno,
        pm.estado_puesto,
        pm.estado_guardia,
        pm.tipo_cobertura,
        pm.horas_extras,
        tc.comentario as comentarios,
        tc.updated_at as comentario_updated_at,
        tc.usuario_id as comentario_usuario_id,
        -- NOMBRE DEL GUARDIA DE COBERTURA (solo cuando es diferente al titular O cuando es PPC)
        CASE 
          WHEN pm.guardia_trabajo_id IS NOT NULL AND (
            pm.guardia_trabajo_id != pm.guardia_id OR 
            pm.guardia_id IS NULL OR
            pm.tipo_cobertura = 'turno_extra'
          ) THEN
            CONCAT(gc.nombre, ' ', COALESCE(gc.apellido_paterno, ''), ' ', COALESCE(gc.apellido_materno, ''))
          ELSE NULL
        END as cobertura_guardia_nombre
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN as_turnos_puestos_operativos p ON p.id = pm.puesto_id
      LEFT JOIN instalaciones i ON i.id = pm.instalacion_id
      LEFT JOIN guardias g ON g.id = pm.guardia_trabajo_id
      LEFT JOIN guardias gt ON gt.id = pm.guardia_id
      LEFT JOIN as_turnos_roles_servicio r ON r.id = p.rol_id
      LEFT JOIN as_turnos_comentarios tc ON (
        pm.id = tc.turno_id 
        AND make_date(pm.anio, pm.mes, pm.dia) = tc.fecha
      )
      LEFT JOIN guardias gc ON gc.id = pm.guardia_trabajo_id
      WHERE make_date(pm.anio, pm.mes, pm.dia) = ${fecha}
      ORDER BY pm.estado_puesto = 'ppc' DESC, i.nombre NULLS LAST, pm.puesto_id, pm.id DESC
    `;
    
    logger.debug(`✅ Datos obtenidos exitosamente: ${rows.length} registros`);
    
    // Debug: mostrar los primeros registros para verificar
    try {
      console.log('🔍 PRIMEROS 3 REGISTROS DE LA CONSULTA:', rows.slice(0, 3).map(row => ({
        pauta_id: row.pauta_id,
        puesto_id: row.puesto_id,
        tipo_cobertura: row.tipo_cobertura,
        guardia_trabajo_id: row.guardia_trabajo_id,
        guardia_id: row.guardia_titular_id,
        cobertura_guardia_id: row.cobertura_guardia_id,
        cobertura_guardia_nombre: row.cobertura_guardia_nombre,
        estado: row.estado
      })));
    } catch (logError) {
      console.warn('⚠️ Error en log de registros:', logError);
    }
    
    return NextResponse.json({
      success: true,
      data: rows,
      fecha,
      total: rows.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo datos de pauta diaria:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack available');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
