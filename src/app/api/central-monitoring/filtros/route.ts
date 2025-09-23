import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getHoyChile, getSystemTimezone } from '@/lib/utils/chile-date';
import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || await getHoyChile();
    const filtroEstado = searchParams.get('filtro') || 'todos';
    const busqueda = searchParams.get('busqueda') || '';
    const filtroInstalacion = searchParams.get('instalacion') || '';
    const tz = searchParams.get('tz') || await getSystemTimezone();

    logger.debug(`🔍 [CENTRAL-MONITORING-FILTROS] Consultando para fecha: ${fecha}, filtro: ${filtroEstado}, busqueda: ${busqueda}, instalacion: ${filtroInstalacion}`);

    // Obtener tenant_id del usuario (por ahora usar el tenant por defecto)
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337'; // Tenant Gard

    // Calcular fecha del día siguiente para la lógica de turno 24h
    const fechaObj = new Date(fecha);
    const fechaSiguiente = new Date(fechaObj);
    fechaSiguiente.setDate(fechaObj.getDate() + 1);
    const fechaSiguienteStr = fechaSiguiente.toISOString().split('T')[0];

    logger.debug(`📅 [CENTRAL-MONITORING-FILTROS] Lógica de turno 24h: ${fecha} 12:00 PM → ${fechaSiguienteStr} 11:59 AM`);

    // Query base para obtener todos los llamados con nueva lógica de turno 24h
    let query = `
      SELECT 
        -- Usar siempre el ID de la vista para evitar duplicados
        v.id as id,
        v.instalacion_id,
        v.guardia_id,
        v.pauta_id,
        v.puesto_id,
        v.programado_para::text as programado_para,
        -- Usar estado real si existe, sino usar el de la vista
        COALESCE(cl.estado, v.estado_llamado) as estado,
        v.contacto_tipo,
        v.contacto_telefono,
        v.contacto_nombre,
        COALESCE(cl.observaciones, v.observaciones) as observaciones,
        cl.ejecutado_en,
        v.instalacion_nombre,
        v.guardia_nombre,
        v.nombre_puesto,
        v.rol_nombre,
        v.intervalo_minutos,
        v.ventana_inicio::text as ventana_inicio,
        v.ventana_fin::text as ventana_fin,
        v.modo,
        v.mensaje_template,
        v.es_urgente,
        v.es_actual,
        v.es_proximo,
        -- Calcular minutos de atraso (sin conversión de zona horaria)
        CASE 
          WHEN v.programado_para < now() THEN 
            EXTRACT(EPOCH FROM (now() - v.programado_para)) / 60
          ELSE 0
        END as minutos_atraso
      FROM central_v_llamados_automaticos v
      LEFT JOIN central_llamados cl ON cl.id = v.id
      WHERE (
        -- Llamados del día actual desde las 12:00 PM hasta las 23:59 PM
        (DATE(v.programado_para AT TIME ZONE 'America/Santiago') = $1 
         AND EXTRACT(HOUR FROM v.programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        -- Llamados del día siguiente desde las 00:00 AM hasta las 11:59 AM
        (DATE(v.programado_para AT TIME ZONE 'America/Santiago') = $2 
         AND EXTRACT(HOUR FROM v.programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
      AND v.tenant_id = $3
    `;

    const params: any[] = [fecha, fechaSiguienteStr, tenantId];

    // Aplicar filtros de estado
    if (filtroEstado !== 'todos') {
      if (filtroEstado === 'completados') {
        // Completados: todos los que no están pendientes
        query += ` AND COALESCE(cl.estado, v.estado_llamado) != 'pendiente'`;
      } else if (filtroEstado === 'no_realizados') {
        // No realizados: usar el campo calculado en la vista
        query += ` AND v.es_no_realizado = true`;
      } else if (filtroEstado === 'proximos') {
        // Próximos: futuros del día seleccionado
        query += ` AND v.programado_para > now()`;
      } else if (filtroEstado === 'actuales') {
        // Actuales: hora actual del día actual
        query += ` AND v.es_actual = true`;
      } else if (filtroEstado === 'urgentes') {
        // Urgentes: pendientes que son urgentes
        query += ` AND COALESCE(cl.estado, v.estado_llamado) = 'pendiente' AND v.es_urgente = true`;
      } else {
        // Filtro específico por estado
        query += ` AND COALESCE(cl.estado, v.estado_llamado) = $${params.length + 1}`;
        params.push(filtroEstado);
      }
    }

    // Aplicar filtro por instalación
    if (filtroInstalacion.trim()) {
      query += ` AND v.instalacion_id = $${params.length + 1}`;
      params.push(filtroInstalacion.trim());
    }

    // Aplicar búsqueda
    if (busqueda.trim()) {
      query += ` AND (v.instalacion_nombre ILIKE $${params.length + 1} OR v.guardia_nombre ILIKE $${params.length + 1})`;
      params.push(`%${busqueda.trim()}%`);
    }

    query += ` ORDER BY v.programado_para ASC`;

    logger.debug(`📊 [CENTRAL-MONITORING-FILTROS] Query final: ${query}`);
    logger.debug(`📊 [CENTRAL-MONITORING-FILTROS] Parámetros: ${JSON.stringify(params)}`);

    const { rows } = await pool.query(query, params);

    // Calcular KPIs basados en TODOS los llamados (no filtrados) con nueva lógica de turno 24h
    const queryKPIs = `
      SELECT 
        COALESCE(cl.estado, v.estado_llamado) as estado,
        v.es_actual,
        v.es_proximo,
        v.es_urgente,
        v.es_no_realizado
      FROM central_v_llamados_automaticos v
      LEFT JOIN central_llamados cl ON cl.id = v.id
      WHERE (
        -- Llamados del día actual desde las 12:00 PM hasta las 23:59 PM
        (DATE(v.programado_para AT TIME ZONE 'America/Santiago') = $1 
         AND EXTRACT(HOUR FROM v.programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        -- Llamados del día siguiente desde las 00:00 AM hasta las 11:59 AM
        (DATE(v.programado_para AT TIME ZONE 'America/Santiago') = $2 
         AND EXTRACT(HOUR FROM v.programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
      AND v.tenant_id = $3
    `;

    const { rows: kpiRows } = await pool.query(queryKPIs, [fecha, fechaSiguienteStr, tenantId]);

    // Calcular KPIs
    const kpis = {
      total: kpiRows.length,
      actuales: 0,
      proximos: 0,
      completados: 0,
      no_realizados: 0,
      urgentes: 0
    };

    kpiRows.forEach((row: any) => {
      const estado = row.estado;
      
      if (row.es_actual) kpis.actuales++;
      if (row.es_proximo) kpis.proximos++;
      if (row.es_urgente) kpis.urgentes++;
      if (row.es_no_realizado) kpis.no_realizados++;
      
      if (estado !== 'pendiente') {
        kpis.completados++;
      }
    });

    // Obtener lista de instalaciones disponibles para el filtro
    const queryInstalaciones = `
      SELECT DISTINCT 
        v.instalacion_id,
        v.instalacion_nombre
      FROM central_v_llamados_automaticos v
      WHERE v.tenant_id = $1
      ORDER BY v.instalacion_nombre
    `;
    
    const { rows: instalacionesRows } = await pool.query(queryInstalaciones, [tenantId]);

    logger.debug(`✅ [CENTRAL-MONITORING-FILTROS] Llamados encontrados: ${rows.length}`);
    logger.debug(`📊 [CENTRAL-MONITORING-FILTROS] KPIs calculados:`, kpis);
    logger.debug(`🏢 [CENTRAL-MONITORING-FILTROS] Instalaciones disponibles: ${instalacionesRows.length}`);

    return NextResponse.json({
      success: true,
      data: {
        llamados: rows,
        kpis: kpis,
        instalaciones: instalacionesRows,
        filtro_aplicado: filtroEstado,
        busqueda_aplicada: busqueda
      }
    });

  } catch (error) {
    logger.error('❌ [CENTRAL-MONITORING-FILTROS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
