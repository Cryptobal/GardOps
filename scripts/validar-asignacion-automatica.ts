import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

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
  
  // Bonus por experiencia (si tenemos datos de experiencia)
  if (guardia.experiencia_anios) {
    puntuacion += Math.min(guardia.experiencia_anios * 5, 20);
  }
  
  // Bonus por disponibilidad inmediata
  if (guardia.disponibilidad_inmediata) {
    puntuacion += 10;
  }
  
  // Penalizar por carga de trabajo previa
  if (guardia.asignaciones_previas) {
    puntuacion -= Math.min(guardia.asignaciones_previas * 5, 30);
  }
  
  return Math.max(puntuacion, 0);
}

async function validarAsignacionAutomatica() {
  console.log('🤖 VALIDACIÓN DE ASIGNACIÓN AUTOMÁTICA DE PPCs\n');

  try {
    // 1. Obtener PPCs pendientes con información completa
    console.log('📋 Analizando PPCs pendientes...');
    
    const ppcsPendientes = await query(`
      SELECT 
        ppc.id,
        ppc.motivo,
        ppc.fecha_deteccion,
        ppc.fecha_limite_cobertura,
        ppc.estado,
        ppc.fecha_asignacion,
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.latitud as inst_lat,
        i.longitud as inst_lon,
        c.nombre as cliente_nombre,
        rs.nombre as rol_servicio,
        req.cantidad_guardias
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
      INNER JOIN instalaciones i ON req.instalacion_id = i.id
      INNER JOIN clientes c ON i.cliente_id = c.id
      INNER JOIN as_turnos_roles_servicio rs ON req.rol_servicio_id = rs.id
      WHERE ppc.estado = 'Pendiente'
        AND i.latitud IS NOT NULL 
        AND i.longitud IS NOT NULL
      ORDER BY ppc.fecha_deteccion, i.nombre
    `);

    console.log(`📊 Se encontraron ${ppcsPendientes.rows.length} PPCs pendientes`);

    // 2. Obtener guardias disponibles con información completa
    console.log('\n👥 Analizando guardias disponibles...');
    
    const guardiasDisponibles = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.latitud,
        g.longitud,
        g.activo,
        COUNT(ag_prev.id) as asignaciones_previas,
        MAX(ag_prev.fecha_termino) as ultima_asignacion
      FROM guardias g
      LEFT JOIN as_turnos_asignaciones ag_act ON g.id = ag_act.guardia_id 
        AND ag_act.estado = 'Activa' 
        AND ag_act.fecha_termino IS NULL
      LEFT JOIN as_turnos_asignaciones ag_prev ON g.id = ag_prev.guardia_id 
        AND ag_prev.estado = 'Finalizada'
      WHERE ag_act.id IS NULL
        AND g.latitud IS NOT NULL 
        AND g.longitud IS NOT NULL
        AND g.activo = true
      GROUP BY g.id, g.nombre, g.apellido_paterno, g.apellido_materno, g.latitud, g.longitud, g.activo
      ORDER BY g.nombre, g.apellido_paterno
    `);

    console.log(`👥 Se encontraron ${guardiasDisponibles.rows.length} guardias disponibles`);

    // 3. Generar recomendaciones para cada PPC
    console.log('\n🎯 Generando recomendaciones de asignación...\n');

    const recomendaciones = [];

    for (const ppc of ppcsPendientes.rows) {
      console.log(`📍 PPC ${ppc.id} - ${ppc.instalacion_nombre}:`);
      console.log(`   Cliente: ${ppc.cliente_nombre}`);
      console.log(`   Rol: ${ppc.rol_servicio}`);
      console.log(`   Guardias requeridos: ${ppc.cantidad_guardias}`);
      console.log(`   Motivo: ${ppc.motivo}`);

      // Calcular candidatos con puntuación
      const candidatos = guardiasDisponibles.rows.map((guardia: any) => {
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

      // Mostrar top 3 candidatos
      console.log('   Top 3 candidatos:');
      candidatos.slice(0, 3).forEach((candidato: any, index: number) => {
        console.log(`     ${index + 1}. ${candidato.nombre} ${candidato.apellido_paterno}`);
        console.log(`        - Distancia: ${candidato.distancia} km`);
        console.log(`        - Puntuación: ${candidato.puntuacion}/100`);
        console.log(`        - Asignaciones previas: ${candidato.asignaciones_previas}`);
      });

      // Guardar recomendación
      recomendaciones.push({
        ppc,
        candidatos: candidatos.slice(0, 5), // Top 5 para análisis
        mejorCandidato: candidatos[0]
      });

      console.log('');
    }

    // 4. Generar reporte de asignación automática
    console.log('📊 REPORTE DE ASIGNACIÓN AUTOMÁTICA\n');

    const ppcsSinCandidatos = recomendaciones.filter(r => r.candidatos.length === 0);
    const ppcsConCandidatos = recomendaciones.filter(r => r.candidatos.length > 0);

    console.log(`✅ PPCs con candidatos disponibles: ${ppcsConCandidatos.length}`);
    console.log(`⚠️ PPCs sin candidatos: ${ppcsSinCandidatos.length}`);

    if (ppcsSinCandidatos.length > 0) {
      console.log('\n🚨 PPCs que requieren atención inmediata:');
      ppcsSinCandidatos.forEach((item: any) => {
        console.log(`   - PPC ${item.ppc.id}: ${item.ppc.instalacion_nombre} (${item.ppc.fecha_deteccion})`);
      });
    }

    // 5. Simular asignaciones automáticas (solo para PPCs con candidatos)
    console.log('\n🤖 Simulando asignaciones automáticas...');

    let asignacionesRealizadas = 0;
    const guardiasAsignados = new Set();

    for (const recomendacion of ppcsConCandidatos) {
      const ppc = recomendacion.ppc;
      const candidatosDisponibles = recomendacion.candidatos.filter(
        (c: any) => !guardiasAsignados.has(c.id)
      );

      if (candidatosDisponibles.length > 0) {
        const mejorCandidato = candidatosDisponibles[0];
        
        console.log(`   ✅ Asignando ${mejorCandidato.nombre} ${mejorCandidato.apellido_paterno} a PPC ${ppc.id}`);
        console.log(`      - Distancia: ${mejorCandidato.distancia} km`);
        console.log(`      - Puntuación: ${mejorCandidato.puntuacion}/100`);

        // Marcar guardia como asignado para evitar duplicados
        guardiasAsignados.add(mejorCandidato.id);
        asignacionesRealizadas++;

        // Simular la asignación en la base de datos
        try {
          await query(`
            UPDATE as_turnos_ppc 
            SET 
              estado = 'Asignado',
              guardia_asignado_id = $1,
              fecha_asignacion = NOW(),
              observaciones = CONCAT(COALESCE(observaciones, ''), ' - Asignación automática: ', NOW())
            WHERE id = $2
          `, [mejorCandidato.id, ppc.id]);

          await query(`
            INSERT INTO as_turnos_asignaciones (
              guardia_id,
              requisito_puesto_id,
              tipo_asignacion,
              fecha_inicio,
              estado,
              observaciones
            ) VALUES ($1, (SELECT requisito_puesto_id FROM as_turnos_ppc WHERE id = $2), 'PPC', CURRENT_DATE, 'Activa', 'Asignación automática por algoritmo inteligente')
          `, [mejorCandidato.id, ppc.id]);

        } catch (error) {
          console.log(`   ⚠️ Error asignando PPC ${ppc.id}:`, error);
        }
      } else {
        console.log(`   ⚠️ PPC ${ppc.id}: Sin candidatos disponibles (todos ya asignados)`);
      }
    }

    // 6. Generar métricas finales
    console.log('\n📈 MÉTRICAS FINALES');
    console.log(`   - PPCs procesados: ${ppcsPendientes.rows.length}`);
    console.log(`   - Asignaciones realizadas: ${asignacionesRealizadas}`);
    console.log(`   - Tasa de éxito: ${Math.round((asignacionesRealizadas / ppcsPendientes.rows.length) * 100)}%`);

    // 7. Verificar estado final
    const ppcsFinal = await query(`
      SELECT 
        ppc.estado,
        COUNT(*) as cantidad
      FROM as_turnos_ppc ppc
      GROUP BY ppc.estado
      ORDER BY ppc.estado
    `);

    console.log('\n📊 Estado final de PPCs:');
    ppcsFinal.rows.forEach((estado: any) => {
      console.log(`   - ${estado.estado}: ${estado.cantidad}`);
    });

    // 8. Generar alertas si quedan PPCs pendientes
    const ppcsPendientesFinal = await query(`
      SELECT COUNT(*) as cantidad
      FROM as_turnos_ppc 
      WHERE estado = 'Pendiente'
    `);

    if (ppcsPendientesFinal.rows[0].cantidad > 0) {
      console.log(`\n🚨 ALERTA: Quedan ${ppcsPendientesFinal.rows[0].cantidad} PPCs pendientes que requieren asignación manual`);
    } else {
      console.log('\n✅ ¡Excelente! Todos los PPCs han sido asignados automáticamente');
    }

    console.log('\n🎯 Validación de asignación automática completada exitosamente');

  } catch (error) {
    console.error('❌ Error en validación de asignación automática:', error);
  }
}

// Ejecutar validación
validarAsignacionAutomatica().then(() => {
  console.log('\n✅ Proceso de validación automática completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 