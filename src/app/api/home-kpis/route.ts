import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { obtenerKPIsOS10 } from '@/lib/utils/os10-status';
import { getHoyChile, getSystemTimezone } from '@/lib/utils/chile-date';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

// Configurar para evitar caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Usar configuración de sistema para zona horaria (MIGRACIÓN CRÍTICA)
    const fechaChile = await getHoyChile();
    
    // CORREGIDO: Aplicar la MISMA lógica de turno 24h que Central de Monitoreo
    // Si son las 00:00-11:59, usar el día anterior (turno nocturno)
    // Si son las 12:00-23:59, usar el día actual (turno diurno)
    const fechaObj = new Date(fechaChile);
    const horaActual = new Date().getHours();
    
    let fechaParaKPIs: string;
    if (horaActual < 12) {
      // Madrugada (00:00-11:59): usar día anterior
      fechaObj.setDate(fechaObj.getDate() - 1);
      fechaParaKPIs = fechaObj.toISOString().split('T')[0];
    } else {
      // Tarde/noche (12:00-23:59): usar día actual
      fechaParaKPIs = fechaChile;
    }
    
    const [anio, mes, dia] = fechaParaKPIs.split('-').map(Number);
    
    logger.debug(`🔍 Obteniendo KPIs de página de inicio para fecha: ${anio}/${mes}/${dia} (hora actual: ${horaActual}:00, fecha original: ${fechaChile})`);

    // Obtener tenant_id del usuario (por ahora usar el tenant por defecto)
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337'; // Tenant Gard

    // Obtener KPIs de monitoreo en tiempo real - EXCLUYENDO TURNOS LIBRES
    // CORREGIDO: Usar tipo_turno en lugar de plan_base/estado_operacion y agregar tenant_id
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_turnos,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'en_camino' THEN 1 END) as en_camino,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'no_ira' THEN 1 END) as no_ira,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'llego' THEN 1 END) as llego,
        -- CORREGIDO: Estados NULL se mapean correctamente como pendientes
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'pendiente' OR pm.meta->>'estado_semaforo' IS NULL THEN 1 END) as pendiente,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'retrasado' THEN 1 END) as retrasado,
        COUNT(CASE WHEN pm.estado_operacion IN ('asistido', 'falta_cubierto_por_turno_extra', 'permiso_con_goce_cubierto_por_turno_extra', 'permiso_sin_goce_cubierto_por_turno_extra', 'licencia_cubierto_por_turno_extra', 'ppc_cubierto_por_turno_extra') THEN 1 END) as puestos_cubiertos,
        COUNT(CASE WHEN pm.estado_operacion IN ('falta_no_cubierto', 'permiso_con_goce_no_cubierto', 'permiso_sin_goce_no_cubierto', 'licencia_no_cubierto', 'ppc_no_cubierto') THEN 1 END) as puestos_sin_cobertura,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as puestos_ppc,
        COUNT(CASE WHEN rs.hora_inicio::time < '12:00'::time THEN 1 END) as turnos_dia,
        COUNT(CASE WHEN rs.hora_inicio::time >= '12:00'::time THEN 1 END) as turnos_noche
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
        AND pm.tenant_id = $4
        AND pm.tipo_turno != 'libre'
    `, [anio, mes, dia, tenantId]);


    // Obtener KPIs del Central de Monitoreo usando la MISMA lógica de turno 24h que central-monitoring/filtros
    const tz = await getSystemTimezone();
    
    // CORREGIDO: Usar la misma fecha que Control de Asistencia para mantener coherencia
    // Calcular fecha del día siguiente para la lógica de turno 24h
    const fechaObjMonitoreo = new Date(fechaParaKPIs);
    const fechaSiguiente = new Date(fechaObjMonitoreo);
    fechaSiguiente.setDate(fechaObjMonitoreo.getDate() + 1);
    const fechaSiguienteStr = fechaSiguiente.toISOString().split('T')[0];
    
    const { rows: monitoreoRows } = await pool.query(`
      SELECT 
        COUNT(*) as total_llamados,
        -- Usar la MISMA lógica que central-monitoring/filtros
        COUNT(CASE WHEN v.es_actual = true THEN 1 END) as actuales,
        COUNT(CASE WHEN v.es_proximo = true THEN 1 END) as proximos,
        COUNT(CASE WHEN v.es_urgente = true THEN 1 END) as urgentes,
        COUNT(CASE WHEN v.es_no_realizado = true THEN 1 END) as no_realizados,
        COUNT(CASE WHEN COALESCE(cl.estado, v.estado_llamado) != 'pendiente' THEN 1 END) as completados,
        COUNT(CASE WHEN COALESCE(cl.estado, v.estado_llamado) = 'exitoso' THEN 1 END) as exitosos,
        COUNT(CASE WHEN COALESCE(cl.estado, v.estado_llamado) = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN COALESCE(cl.estado, v.estado_llamado) = 'ocupado' THEN 1 END) as ocupado,
        COUNT(CASE WHEN COALESCE(cl.estado, v.estado_llamado) = 'incidente' THEN 1 END) as incidentes,
        COUNT(CASE WHEN COALESCE(cl.estado, v.estado_llamado) = 'no_registrado' THEN 1 END) as no_registrado,
        COUNT(CASE WHEN COALESCE(cl.estado, v.estado_llamado) = 'pendiente' THEN 1 END) as pendientes
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
    `, [fechaParaKPIs, fechaSiguienteStr, tenantId]);

    const monitoreoKpis = monitoreoRows[0] || {
      total_llamados: 0,
      actuales: 0,
      proximos: 0,
      urgentes: 0,
      no_realizados: 0,
      completados: 0,
      exitosos: 0,
      no_contesta: 0,
      ocupado: 0,
      incidentes: 0,
      no_registrado: 0,
      pendientes: 0
    };

    // Usar el campo no_realizados directamente de la vista
    const noRealizados = parseInt(monitoreoKpis.no_realizados || 0);

    const kpis = {
      ...rows[0],
      monitoreo_urgentes: monitoreoKpis.urgentes,
      monitoreo_actuales: monitoreoKpis.actuales,
      monitoreo_proximos: monitoreoKpis.proximos,
      monitoreo_completados: monitoreoKpis.completados,
      monitoreo_total: monitoreoKpis.total_llamados,
      monitoreo_no_realizados: noRealizados
    } || {
      total_turnos: 0,
      en_camino: 0,
      no_contesta: 0,
      no_ira: 0,
      llego: 0,
      pendiente: 0,
      retrasado: 0,
      puestos_cubiertos: 0,
      puestos_sin_cobertura: 0,
      puestos_ppc: 0,
      turnos_dia: 0,
      turnos_noche: 0,
      monitoreo_urgentes: 0,
      monitoreo_actuales: 0,
      monitoreo_proximos: 0,
      monitoreo_completados: 0,
      monitoreo_total: 0,
      monitoreo_no_realizados: 0
    };

    // Obtener KPIs de OS10
    try {
      const { rows: guardiasOS10 } = await pool.query(`
        SELECT 
          id,
          nombre,
          apellido_paterno,
          apellido_materno,
          fecha_os10,
          activo
        FROM public.guardias 
        WHERE activo = true
        ORDER BY nombre, apellido_paterno, apellido_materno
      `);

      logger.debug(`📊 Total guardias activos para OS10: ${guardiasOS10.length}`);

      // Calcular KPIs de OS10 con 30 días de alerta por defecto
      const kpisOS10 = obtenerKPIsOS10(guardiasOS10, 30);
      
      // Agregar KPIs de OS10 al objeto principal
      kpis.os10_por_vencer = kpisOS10.os10_por_vencer;
      kpis.os10_sin_fecha = kpisOS10.os10_sin_fecha;
      kpis.os10_vencidos = kpisOS10.os10_vencidos;
      kpis.os10_vigentes = kpisOS10.os10_vigentes;

      logger.debug('📈 KPIs OS10 agregados:', kpisOS10);
    } catch (os10Error) {
      console.error('❌ Error obteniendo KPIs de OS10:', os10Error);
      // Continuar sin los KPIs de OS10 si hay error
      kpis.os10_por_vencer = 0;
      kpis.os10_sin_fecha = 0;
      kpis.os10_vencidos = 0;
      kpis.os10_vigentes = 0;
    }

    logger.debug(`✅ KPIs de página de inicio obtenidos:`, kpis);

    return NextResponse.json({
      success: true,
      data: kpis
    });

  } catch (error) {
    console.error('❌ Error obteniendo KPIs de página de inicio:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
