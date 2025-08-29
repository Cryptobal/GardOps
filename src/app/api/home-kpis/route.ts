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

    const kpis = rows[0] || {
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
      turnos_noche: 0
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
