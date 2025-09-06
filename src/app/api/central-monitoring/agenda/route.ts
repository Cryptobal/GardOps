import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Permitir acceso temporal sin autenticación estricta (tanto en desarrollo como producción)
  console.log('🔍 Central Monitoring Agenda: Acceso temporal permitido');
  
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

    console.log(`🔍 [CENTRAL-MONITORING] Consultando llamados para fecha: ${fecha}, timezone: ${tz}`);

    // Obtener llamados desde la vista automática
    let query = `
      SELECT 
        id,
        instalacion_id,
        guardia_id,
        pauta_id,
        puesto_id,
        programado_para,
        estado_llamado as estado,
        contacto_tipo,
        contacto_telefono,
        contacto_nombre,
        observaciones,
        instalacion_nombre,
        guardia_nombre,
        nombre_puesto,
        rol_nombre,
        intervalo_minutos,
        ventana_inicio,
        ventana_fin,
        modo,
        mensaje_template,
        es_urgente,
        es_actual,
        es_proximo,
        -- Calcular minutos de atraso
        CASE 
          WHEN (programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}' < (now() AT TIME ZONE '${tz}') THEN 
            EXTRACT(EPOCH FROM ((now() AT TIME ZONE '${tz}') - ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}'))) / 60
          ELSE 0
        END as minutos_atraso
      FROM central_v_llamados_automaticos
      WHERE DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = $1
    `;

    const params: any[] = [fecha];

    // Aplicar filtros
    if (instalacionFilter) {
      query += ` AND instalacion_id = $${params.length + 1}`;
      params.push(instalacionFilter);
    }

    if (guardiaFilter) {
      query += ` AND (guardia_nombre ILIKE $${params.length + 1} OR instalacion_nombre ILIKE $${params.length + 1})`;
      params.push(`%${guardiaFilter}%`);
    }

    query += ` ORDER BY programado_para ASC`;

    console.log(`📊 [CENTRAL-MONITORING] Query final: ${query.substring(0, 200)}...`);
    console.log(`📊 [CENTRAL-MONITORING] Parámetros: ${JSON.stringify(params)}`);

    const result = await sql.query(query, params);
    
    console.log(`✅ [CENTRAL-MONITORING] Llamados encontrados: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log(`🔍 [CENTRAL-MONITORING] Primer llamado:`, {
        instalacion: result.rows[0].instalacion_nombre,
        programado_para: result.rows[0].programado_para,
        es_actual: result.rows[0].es_actual,
        es_proximo: result.rows[0].es_proximo,
        es_urgente: result.rows[0].es_urgente
      });
    } else {
      console.log(`⚠️ [CENTRAL-MONITORING] No se encontraron llamados. Posibles causas:`);
      console.log(`   - No hay configuración en central_config_instalacion`);
      console.log(`   - No hay turnos con estado 'planificado' para la fecha`);
      console.log(`   - La vista central_v_llamados_automaticos está vacía`);
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      fecha: fecha,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error obteniendo agenda automática:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
