import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Función para calcular distancia entre dos puntos geográficos
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Función para calcular puntuación de candidato
function calcularPuntuacion(guardia: any, ppc: any, distancia: number): number {
  let puntuacion = 100;
  
  // Penalizar por distancia (máximo 50 puntos de penalización)
  puntuacion -= Math.min(distancia * 2, 50);
  
  // Penalizar por carga de trabajo previa
  if (guardia.asignaciones_previas) {
    puntuacion -= Math.min(guardia.asignaciones_previas * 5, 30);
  }
  
  return Math.max(puntuacion, 0);
}

export async function POST() {
  try {
    logger.debug('🤖 Iniciando asignación automática de PPCs...');

    // 1. Obtener PPCs pendientes
    const ppcsPendientes = await query(`
      SELECT 
        ppc.id,
        ppc.fecha,
        ppc.turno,
        i.latitud as inst_lat,
        i.longitud as inst_lon
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
      INNER JOIN instalaciones i ON req.instalacion_id = i.id
      WHERE ppc.estado = 'Pendiente'
        AND i.latitud IS NOT NULL 
        AND i.longitud IS NOT NULL
      ORDER BY ppc.fecha
    `);

    if (ppcsPendientes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay PPCs pendientes para asignar',
        asignacionesRealizadas: 0
      });
    }

    // 2. Obtener guardias disponibles
    const guardiasDisponibles = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.latitud,
        g.longitud,
        COUNT(ag_prev.id) as asignaciones_previas
      FROM guardias g
      LEFT JOIN as_turnos_asignaciones ag_act ON g.id = ag_act.guardia_id 
        AND ag_act.estado = 'Activa' 
        AND ag_act.fecha_termino IS NULL
      LEFT JOIN as_turnos_asignaciones ag_prev ON g.id = ag_prev.guardia_id 
        AND ag_prev.estado = 'Finalizada'
      WHERE ag_act.id IS NULL
        AND g.latitud IS NOT NULL 
        AND g.longitud IS NOT NULL
        AND g.estado = 'Activo'
      GROUP BY g.id, g.nombre, g.apellido_paterno, g.latitud, g.longitud
      ORDER BY g.nombre
    `);

    if (guardiasDisponibles.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No hay guardias disponibles para asignar',
        asignacionesRealizadas: 0
      });
    }

    // 3. Ejecutar asignación automática
    let asignacionesRealizadas = 0;
    const guardiasAsignados = new Set();

    for (const ppc of ppcsPendientes.rows) {
      // Filtrar guardias no asignados aún
      const candidatosDisponibles = guardiasDisponibles.rows.filter(
        (g: any) => !guardiasAsignados.has(g.id)
      );

      if (candidatosDisponibles.length === 0) {
        logger.debug(`⚠️ PPC ${ppc.id}: Sin candidatos disponibles`);
        continue;
      }

      // Calcular puntuación para cada candidato
      const candidatosConPuntuacion = candidatosDisponibles.map((guardia: any) => {
        const distancia = calcularDistancia(
          parseFloat(ppc.inst_lat), 
          parseFloat(ppc.inst_lon),
          parseFloat(guardia.latitud), 
          parseFloat(guardia.longitud)
        );
        
        const puntuacion = calcularPuntuacion(guardia, ppc, distancia);
        
        return {
          ...guardia,
          distancia: Math.round(distancia * 100) / 100,
          puntuacion: Math.round(puntuacion)
        };
      }).sort((a: any, b: any) => b.puntuacion - a.puntuacion);

      const mejorCandidato = candidatosConPuntuacion[0];
      
      console.log(`✅ Asignando ${mejorCandidato.nombre} ${mejorCandidato.apellido_paterno} a PPC ${ppc.id} (puntuación: ${mejorCandidato.puntuacion})`);

      // Realizar la asignación
      try {
        // Actualizar PPC
        await query(`
          UPDATE as_turnos_ppc 
          SET 
            estado = 'Asignado',
            guardia_asignado_id = $1,
            fecha_asignacion = NOW(),
            observaciones = CONCAT(COALESCE(observaciones, ''), ' - Asignación automática: ', NOW())
          WHERE id = $2
        `, [mejorCandidato.id, ppc.id]);

        // Crear asignación
        await query(`
          INSERT INTO as_turnos_asignaciones (
            guardia_id,
            requisito_puesto_id,
            tipo_asignacion,
            fecha_inicio,
            estado,
            observaciones
          ) VALUES ($1, (SELECT requisito_puesto_id FROM as_turnos_ppc WHERE id = $2), 'PPC', $3, 'Activa', 'Asignación automática por algoritmo inteligente')
        `, [mejorCandidato.id, ppc.id, ppc.fecha]);

        // Marcar guardia como asignado
        guardiasAsignados.add(mejorCandidato.id);
        asignacionesRealizadas++;

      } catch (error) {
        console.error(`❌ Error asignando PPC ${ppc.id}:`, error);
      }
    }

    logger.debug(`🎯 Asignación automática completada: ${asignacionesRealizadas} asignaciones realizadas`);

    return NextResponse.json({
      success: true,
      message: `Asignación automática completada exitosamente`,
      asignacionesRealizadas,
      ppcsProcesados: ppcsPendientes.rows.length,
      guardiasDisponibles: guardiasDisponibles.rows.length
    });

  } catch (error) {
    console.error('❌ Error en asignación automática:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        message: 'Error ejecutando asignación automática'
      },
      { status: 500 }
    );
  }
} 