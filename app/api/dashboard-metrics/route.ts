import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    // 1. Guardias en Turno (activos hoy)
    const guardiasEnTurnoResult = await query(`
      SELECT COUNT(*) as count 
      FROM guardias 
      WHERE estado = 'Activo'
    `)
    const guardiasEnTurno = parseInt(guardiasEnTurnoResult.rows[0]?.count || '0')

    // 2. Instalaciones Operativas (activas)
    const instalacionesOperativasResult = await query(`
      SELECT COUNT(*) as count 
      FROM instalaciones 
      WHERE estado = 'Activa'
    `)
    const instalacionesOperativas = parseInt(instalacionesOperativasResult.rows[0]?.count || '0')

    // 3. Turnos no cubiertos (PPC pendientes)
    const ppcPendientesResult = await query(`
      SELECT COUNT(*) as count 
      FROM ppc_registros 
      WHERE estado = 'pendiente'
        AND fecha_creacion = CURRENT_DATE
    `)
    const turnosNoCubiertos = parseInt(ppcPendientesResult.rows[0]?.count || '0')

    // 4. Instalaciones con alertas críticas (2+ PPC activos)
    const instalacionesCriticasResult = await query(`
      SELECT COUNT(DISTINCT instalacion_id) as count
      FROM (
        SELECT instalacion_id, COUNT(*) as ppc_count
        FROM ppc_registros 
        WHERE estado = 'pendiente'
          AND fecha_creacion >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY instalacion_id
        HAVING COUNT(*) >= 2
      ) AS instalaciones_con_multiples_ppc
    `)
    const instalacionesCriticas = parseInt(instalacionesCriticasResult.rows[0]?.count || '0')

    // 5. Resumen operacional adicional
    const coberturasActivasResult = await query(`
      SELECT COUNT(*) as count 
      FROM asignaciones_operativas ao
      JOIN instalaciones i ON ao.instalacion_id = i.id
      WHERE i.estado = 'Activa'
    `)
    const coberturasActivas = parseInt(coberturasActivasResult.rows[0]?.count || '0')

    // 6. Guardias externos vs contratados (simplificado - usar todos como contratados por ahora)
    const guardiasConteo = { 
      externos: '0', 
      contratados: guardiasEnTurno.toString() 
    }

    // 7. Top 5 instalaciones con más PPC
    const topPpcResult = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        COUNT(p.id) as ppc_count
      FROM ppc_registros p
      JOIN instalaciones i ON p.instalacion_id = i.id
      WHERE p.estado = 'pendiente'
        AND p.fecha_creacion >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY i.id, i.nombre
      ORDER BY ppc_count DESC
      LIMIT 5
    `)

    // 8. Instalaciones incompletas (sin cobertura completa)
    const instalacionesIncompletasResult = await query(`
      SELECT COUNT(DISTINCT i.id) as count
      FROM instalaciones i
      LEFT JOIN asignaciones_operativas ao ON i.id = ao.instalacion_id
      LEFT JOIN guardias_asignados ga ON ao.id = ga.asignacion_operativa_id
      WHERE i.estado = 'Activa'
        AND (ga.id IS NULL OR ga.estado = 'pendiente')
    `)
    const instalacionesIncompletas = parseInt(instalacionesIncompletasResult.rows[0]?.count || '0')

    return NextResponse.json({
      success: true,
      metrics: {
        guardiasEnTurno,
        instalacionesOperativas,
        turnosNoCubiertos,
        instalacionesCriticas,
        resumenOperacional: {
          coberturasActivas,
          guardiasExternos: parseInt(guardiasConteo.externos || '0'),
          guardiasContratados: parseInt(guardiasConteo.contratados || '0'),
          instalacionesIncompletas
        },
        topPpcPorInstalacion: topPpcResult.rows
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener métricas del dashboard',
        details: error instanceof Error ? error.message : 'Error desconocido',
        // Datos mock para desarrollo
        metrics: {
          guardiasEnTurno: 42,
          instalacionesOperativas: 156,
          turnosNoCubiertos: 8,
          instalacionesCriticas: 3,
          resumenOperacional: {
            coberturasActivas: 134,
            guardiasExternos: 18,
            guardiasContratados: 24,
            instalacionesIncompletas: 12
          },
          topPpcPorInstalacion: [
            { instalacion_nombre: 'Plaza Los Leones', ppc_count: 5 },
            { instalacion_nombre: 'Centro Comercial Maipú', ppc_count: 4 },
            { instalacion_nombre: 'Oficinas Santiago Centro', ppc_count: 3 },
            { instalacion_nombre: 'Clínica Las Condes', ppc_count: 2 },
            { instalacion_nombre: 'Universidad de Chile', ppc_count: 2 }
          ]
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 