import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const anio = new Date().getFullYear();
    const mes = new Date().getMonth() + 1;
    const dia = new Date().getDate();
    
    console.log(`🔍 Obteniendo KPIs de página de inicio para fecha: ${anio}/${mes}/${dia}`);

    // Obtener KPIs de monitoreo en tiempo real
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_turnos,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'en_camino' THEN 1 END) as en_camino,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'no_ira' THEN 1 END) as no_ira,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'llego' THEN 1 END) as llego,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'pendiente' OR pm.meta->>'estado_semaforo' IS NULL THEN 1 END) as pendiente,
        COUNT(CASE WHEN pm.meta->>'estado_semaforo' = 'retrasado' THEN 1 END) as retrasado,
        COUNT(CASE WHEN pm.estado IN ('Activo', 'asistido', 'reemplazo', 'te') THEN 1 END) as puestos_cubiertos,
        COUNT(CASE WHEN pm.estado = 'sin_cobertura' THEN 1 END) as puestos_sin_cobertura,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as puestos_ppc,
        COUNT(CASE WHEN rs.hora_inicio::time < '12:00'::time THEN 1 END) as turnos_dia,
        COUNT(CASE WHEN rs.hora_inicio::time >= '12:00'::time THEN 1 END) as turnos_noche
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
    `, [anio, mes, dia]);

    // Obtener KPIs del Central de Monitoreo usando EXACTAMENTE la misma lógica que el endpoint de la Central
    const fechaActual = new Date().toISOString().split('T')[0];
    const tz = 'America/Santiago';
    const { rows: monitoreoRows } = await pool.query(`
      SELECT 
        COUNT(*) as total_llamados,
        -- Actuales: solo si es el día actual y en la hora actual en la TZ especificada
        COUNT(CASE 
          WHEN DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = $1
           AND date_trunc('hour', ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = date_trunc('hour', (now() AT TIME ZONE '${tz}'))
          THEN 1 
        END) as actuales,
        -- Próximos: futuros del día actual + todos los de días futuros en la TZ especificada
        COUNT(CASE 
          WHEN (DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = $1 AND ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}') > (now() AT TIME ZONE '${tz}'))
           OR DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) > $1
          THEN 1 
        END) as proximos,
        -- Urgentes: solo del día actual que ya pasaron >30 min en la TZ especificada
        COUNT(CASE 
          WHEN DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = $1
           AND ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}') < (now() AT TIME ZONE '${tz}') - interval '30 minutes'
          THEN 1 
        END) as urgentes,
        COUNT(CASE WHEN estado_llamado = 'exitoso' THEN 1 END) as exitosos,
        COUNT(CASE WHEN estado_llamado = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN estado_llamado = 'ocupado' THEN 1 END) as ocupado,
        COUNT(CASE WHEN estado_llamado = 'incidente' THEN 1 END) as incidentes,
        COUNT(CASE WHEN estado_llamado = 'no_registrado' THEN 1 END) as no_registrado,
        COUNT(CASE WHEN estado_llamado = 'pendiente' THEN 1 END) as pendientes
      FROM central_v_llamados_automaticos
      WHERE DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = $1
    `, [fechaActual]);

    const monitoreoKpis = monitoreoRows[0] || {
      total_llamados: 0,
      actuales: 0,
      proximos: 0,
      urgentes: 0,
      exitosos: 0,
      no_contesta: 0,
      ocupado: 0,
      incidentes: 0,
      no_registrado: 0,
      pendientes: 0
    };

    // "No realizados" son los urgentes (llamados atrasados más de 30 min)
    const noRealizados = parseInt(monitoreoKpis.urgentes || 0);

    const kpis = {
      ...rows[0],
      monitoreo_urgentes: monitoreoKpis.urgentes,
      monitoreo_actuales: monitoreoKpis.actuales,
      monitoreo_proximos: monitoreoKpis.proximos,
      monitoreo_completados: monitoreoKpis.exitosos,
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

    console.log(`✅ KPIs de página de inicio obtenidos:`, kpis);

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
