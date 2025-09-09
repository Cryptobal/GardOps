import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];
    const instalacionId = searchParams.get('instalacion');
    const turno = searchParams.get('turno');
    const incluirLibres = searchParams.get('incluirLibres') === 'true';

    const [anio, mes, dia] = fecha.split('-').map(Number);

    console.log(`🔍 Obteniendo datos de control de asistencias para fecha: ${fecha} (${anio}/${mes}/${dia}), incluirLibres: ${incluirLibres}`);

    let query = `
      SELECT
        pm.id as pauta_id,
        pm.anio,
        pm.mes,
        pm.dia,
        CONCAT(pm.anio, '-', LPAD(pm.mes::text, 2, '0'), '-', LPAD(pm.dia::text, 2, '0')) as fecha,
        pm.estado as estado_pauta,
        pm.estado_ui,
        pm.meta,
        pm.meta->>'estado_semaforo' as estado_semaforo,
        pm.meta->>'observaciones_semaforo' as observaciones_semaforo,
        pm.meta->>'ultima_actualizacion_semaforo' as ultima_actualizacion,
        pm.estado_ui as estado_pauta_ui,
        g.id as guardia_id,
        CONCAT(g.nombre, ' ', COALESCE(g.apellido_paterno, ''), ' ', COALESCE(g.apellido_materno, '')) as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.telefono as guardia_telefono,
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        po.id as puesto_id,
        po.nombre_puesto,
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        CASE
          WHEN rs.hora_inicio::time < '12:00'::time THEN 'dia'
          ELSE 'noche'
        END as tipo_turno,
        CASE
          WHEN pm.meta->>'estado_semaforo' IS NULL THEN 'pendiente'
          ELSE pm.meta->>'estado_semaforo'
        END as estado_monitoreo
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
    `;
    
    // Agregar filtro según incluirLibres - CORREGIDO PARA NUEVA LÓGICA
    if (!incluirLibres) {
      // Excluir días libres usando la nueva lógica estándar
      query += ` AND NOT (pm.estado = 'libre' OR pm.estado_operacion = 'libre')`;
    } else {
      // Incluir todos los estados
      query += ` AND pm.estado IN ('planificado', 'trabajado', 'libre', 'sin_cobertura')`;
    }
    
    const params: any[] = [anio, mes, dia];

    if (instalacionId) {
      query += ` AND i.id = $${params.length + 1}`;
      params.push(instalacionId);
    }

    if (turno) {
      query += ` AND CASE
        WHEN rs.hora_inicio::time < '12:00'::time THEN 'dia'
        ELSE 'noche'
      END = $${params.length + 1}`;
      params.push(turno);
    }

    query += ` ORDER BY i.nombre, rs.hora_inicio`;

    const { rows } = await pool.query(query, params);

    // Calcular KPIs
    const kpis = {
      total_turnos: rows.length,
      pendiente: 0,
      en_camino: 0,
      llego: 0,
      no_contesta: 0,
      no_ira: 0,
      retrasado: 0,
      puestos_cubiertos: 0,
      puestos_sin_cobertura: 0,
      puestos_ppc: 0,
      turnos_dia: 0,
      turnos_noche: 0
    };

    rows.forEach((row: any) => {
      const estadoMonitoreo = row.estado_monitoreo;
      const tipoTurno = row.tipo_turno;

      // Contar por estado
      if (kpis.hasOwnProperty(estadoMonitoreo)) {
        kpis[estadoMonitoreo as keyof typeof kpis]++;
      }

      // Contar por tipo de turno
      if (tipoTurno === 'dia') {
        kpis.turnos_dia++;
      } else {
        kpis.turnos_noche++;
      }
    });

    // Agrupar por instalaciones
    const instalacionesMap = new Map();
    rows.forEach((row: any) => {
      if (!instalacionesMap.has(row.instalacion_id)) {
        instalacionesMap.set(row.instalacion_id, {
          instalacion_id: row.instalacion_id,
          instalacion_nombre: row.instalacion_nombre,
          instalacion_telefono: row.instalacion_telefono,
          turnos: []
        });
      }
      instalacionesMap.get(row.instalacion_id).turnos.push({
        pauta_id: row.pauta_id,
        instalacion_nombre: row.instalacion_nombre,
        guardia_nombre: row.guardia_nombre,
        guardia_telefono: row.guardia_telefono,
        instalacion_telefono: row.instalacion_telefono,
        puesto_nombre: row.nombre_puesto,
        rol_nombre: row.rol_nombre,
        hora_inicio: row.hora_inicio,
        hora_termino: row.hora_termino,
        tipo_turno: row.tipo_turno,
        estado_semaforo: row.estado_semaforo,
        observaciones_semaforo: row.observaciones_semaforo,
        ultima_actualizacion: row.ultima_actualizacion,
        estado_pauta_ui: row.estado_pauta_ui
      });
    });

    const instalaciones = Array.from(instalacionesMap.values());

    logger.debug(`✅ Datos de control de asistencias obtenidos: ${rows.length} turnos, ${instalaciones.length} instalaciones`);

    return NextResponse.json({
      success: true,
      data: {
        fecha,
        kpis,
        instalaciones,
        turnos: rows.map((row: any) => ({
          pauta_id: row.pauta_id,
          instalacion_nombre: row.instalacion_nombre,
          guardia_nombre: row.guardia_nombre,
          guardia_telefono: row.guardia_telefono,
          instalacion_telefono: row.instalacion_telefono,
          puesto_nombre: row.nombre_puesto,
          rol_nombre: row.rol_nombre,
          hora_inicio: row.hora_inicio,
          hora_termino: row.hora_termino,
          tipo_turno: row.tipo_turno,
          estado_semaforo: row.estado_semaforo,
          observaciones_semaforo: row.observaciones_semaforo,
          ultima_actualizacion: row.ultima_actualizacion,
          estado_pauta_ui: row.estado_pauta_ui
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo datos de control de asistencias:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
