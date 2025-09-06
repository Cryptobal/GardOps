import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  // Permitir acceso temporal sin autenticación estricta (tanto en desarrollo como producción)
  console.log('🔍 Central Monitoring KPIs: Acceso temporal permitido');
  
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];
    const tz = searchParams.get('tz') || 'America/Santiago';
    const fechaActual = new Date().toISOString().split('T')[0];

    // Obtener KPIs con lógica corregida (sin conversiones de zona horaria)
    const result = await sql.query(`
      SELECT 
        -- Total: solo llamados del día seleccionado
        COUNT(CASE WHEN DATE(programado_para) = $1 THEN 1 END) as total_llamados,
        
        -- Actuales: solo si es el día actual Y en la hora actual
        COUNT(CASE 
          WHEN DATE(programado_para) = CURRENT_DATE
           AND date_trunc('hour', programado_para) = date_trunc('hour', now())
          THEN 1 
        END) as actuales,
        
        -- Próximos: futuros del día seleccionado
        COUNT(CASE 
          WHEN DATE(programado_para) = $1 
           AND programado_para > now()
          THEN 1 
        END) as proximos,
        
        -- No Realizados: llamados que ya pasaron su hora Y siguen pendientes
        COUNT(CASE 
          WHEN programado_para < now()
           AND (estado_llamado IS NULL OR estado_llamado = 'pendiente')
           AND DATE(programado_para) < CURRENT_DATE  -- Solo días anteriores
          THEN 1 
        END) as no_realizados,
        
        -- Urgentes: pasados >30 min sin completar
        COUNT(CASE 
          WHEN programado_para < now() - interval '30 minutes'
           AND (estado_llamado IS NULL OR estado_llamado = 'pendiente')
          THEN 1 
        END) as urgentes,
        
        COUNT(CASE WHEN estado_llamado = 'exitoso' THEN 1 END) as exitosos,
        COUNT(CASE WHEN estado_llamado = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN estado_llamado = 'ocupado' THEN 1 END) as ocupado,
        COUNT(CASE WHEN estado_llamado = 'incidente' THEN 1 END) as incidentes,
        COUNT(CASE WHEN estado_llamado = 'no_registrado' THEN 1 END) as no_registrado,
        COUNT(CASE WHEN estado_llamado = 'pendiente' THEN 1 END) as pendientes,
        ROUND(
          (COUNT(CASE WHEN estado_llamado = 'exitoso' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as tasa_exito
      FROM central_v_llamados_automaticos
    `, [fecha]);

    const kpis = result.rows[0];

    // Obtener estadísticas por instalación con lógica corregida
    const statsPorInstalacion = await sql.query(`
      SELECT 
        instalacion_id,
        instalacion_nombre,
        COUNT(*) as total_llamados,
        -- Actuales: solo si es el día actual y en la hora actual
        COUNT(CASE 
          WHEN DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = $1
           AND date_trunc('hour', ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = date_trunc('hour', (now() AT TIME ZONE '${tz}'))
          THEN 1 
        END) as actuales,
        -- Próximos: futuros del día actual + todos los de días futuros
        COUNT(CASE 
          WHEN (DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = $1 AND ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}') > (now() AT TIME ZONE '${tz}'))
           OR DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) > $1
          THEN 1 
        END) as proximos,
        -- Urgentes: solo del día actual que ya pasaron >30 min
        COUNT(CASE 
          WHEN DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) = $1
           AND ((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}') < (now() AT TIME ZONE '${tz}') - interval '30 minutes'
          THEN 1 
        END) as urgentes,
        COUNT(CASE WHEN estado_llamado = 'exitoso' THEN 1 END) as exitosos,
        COUNT(CASE WHEN estado_llamado = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN estado_llamado = 'ocupado' THEN 1 END) as ocupado,
        COUNT(CASE WHEN estado_llamado = 'incidente' THEN 1 END) as incidentes
      FROM central_v_llamados_automaticos
      WHERE DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE '${tz}')) >= $1
      GROUP BY instalacion_id, instalacion_nombre
      ORDER BY total_llamados DESC
    `, [fecha]);

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          total: parseInt(kpis.total_llamados) || 0,
          actuales: parseInt(kpis.actuales) || 0,
          proximos: parseInt(kpis.proximos) || 0,
          no_realizados: parseInt(kpis.no_realizados) || 0,
          urgentes: parseInt(kpis.urgentes) || 0,
          exitosos: parseInt(kpis.exitosos) || 0,
          no_contesta: parseInt(kpis.no_contesta) || 0,
          ocupado: parseInt(kpis.ocupado) || 0,
          incidentes: parseInt(kpis.incidentes) || 0,
          no_registrado: parseInt(kpis.no_registrado) || 0,
          pendientes: parseInt(kpis.pendientes) || 0,
          tasa_exito: parseFloat(kpis.tasa_exito) || 0
        },
        por_instalacion: statsPorInstalacion.rows,
        fecha: fecha
      }
    });

  } catch (error) {
    console.error('Error obteniendo KPIs automáticos:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
