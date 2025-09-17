import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Permitir acceso temporal sin autenticación estricta (tanto en desarrollo como producción)
  logger.debug('🔍 Central Monitoring Agenda: Acceso temporal permitido');
  
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];
    
    // Obtener zona horaria desde configuración de sistema
    const configResult = await sql`
      SELECT zona_horaria FROM configuracion_sistema 
      WHERE tenant_id IS NULL 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const tz = configResult.rows[0]?.zona_horaria || searchParams.get('tz') || 'America/Santiago';
    const instalacionFilter = searchParams.get('instalacion');
    const guardiaFilter = searchParams.get('guardia');

    logger.debug(`🔍 [CENTRAL-MONITORING] Consultando llamados para fecha: ${fecha}, timezone: ${tz}`);

    // Obtener llamados desde la vista automática con IDs consistentes
    let query = `
      SELECT 
        -- Usar ID real de central_llamados si existe, sino usar el de la vista
        COALESCE(cl.id, v.id) as id,
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
        v.observaciones,
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
      WHERE DATE(v.programado_para) = $1
    `;

    const params: any[] = [fecha];

    // Aplicar filtros
    if (instalacionFilter) {
      query += ` AND v.instalacion_id = $${params.length + 1}`;
      params.push(instalacionFilter);
    }

    if (guardiaFilter) {
      query += ` AND (v.guardia_nombre ILIKE $${params.length + 1} OR v.instalacion_nombre ILIKE $${params.length + 1})`;
      params.push(`%${guardiaFilter}%`);
    }

    query += ` ORDER BY v.programado_para ASC`;

    console.log(`📊 [CENTRAL-MONITORING] Query final: ${query.substring(0, 200)}...`);
    console.log(`📊 [CENTRAL-MONITORING] Parámetros: ${JSON.stringify(params)}`);

    const result = await sql.query(query, params);
    
    logger.debug(`✅ [CENTRAL-MONITORING] Llamados encontrados: ${result.rows.length}`);
    if (result.rows.length > 0) {
      logger.debug(`🔍 [CENTRAL-MONITORING] Primer llamado:`, {
        instalacion: result.rows[0].instalacion_nombre,
        programado_para: result.rows[0].programado_para,
        es_actual: result.rows[0].es_actual,
        es_proximo: result.rows[0].es_proximo,
        es_urgente: result.rows[0].es_urgente
      });
    } else {
      logger.debug(`⚠️ [CENTRAL-MONITORING] No se encontraron llamados. Posibles causas:`);
      logger.debug(`   - No hay configuración en central_config_instalacion`);
      logger.debug(`   - No hay turnos con estado 'planificado' para la fecha`);
      logger.debug(`   - La vista central_v_llamados_automaticos está vacía`);
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      fecha: fecha,
      total: result.rows.length
    });

  } catch (error) {
    logger.error('Error obteniendo agenda automática::', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
