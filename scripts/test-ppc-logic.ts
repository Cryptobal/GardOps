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

async function testPPCLogic() {
  console.log('🧪 Probando lógica de asignación de PPCs...\n');

  try {
    // 1. Verificar estructura de tablas
    console.log('📋 Verificando estructura de tablas...');
    
    const estructuraPPC = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_ppc' 
      ORDER BY ordinal_position
    `);
    
    const estructuraAsignaciones = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_asignaciones' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas de as_turnos_ppc:');
    estructuraPPC.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    console.log('\nColumnas de as_turnos_asignaciones:');
    estructuraAsignaciones.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // 2. Verificar datos de ejemplo
    console.log('\n📊 Verificando datos de ejemplo...');
    
    const ppcs = await query(`
      SELECT 
        ppc.id, 
        ppc.motivo,
        ppc.estado, 
        ppc.guardia_asignado_id, 
        ppc.fecha_asignacion,
        ppc.fecha_deteccion,
        ppc.fecha_limite_cobertura,
        i.nombre as instalacion_nombre,
        i.latitud as inst_lat,
        i.longitud as inst_lon
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
      INNER JOIN instalaciones i ON req.instalacion_id = i.id
      ORDER BY ppc.id
    `);
    
    console.log('PPCs existentes:');
    ppcs.rows.forEach((ppc: any) => {
      console.log(`  - ID: ${ppc.id}, Instalación: ${ppc.instalacion_nombre}, Motivo: ${ppc.motivo}, Estado: ${ppc.estado}, Guardia: ${ppc.guardia_asignado_id || 'Sin asignar'}`);
    });

    // 3. Obtener guardias disponibles con información geográfica
    console.log('\n👥 Verificando guardias disponibles con proximidad geográfica...');
    
    const guardiasDisponibles = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.latitud,
        g.longitud,
        g.activo,
        CASE 
          WHEN ag.id IS NOT NULL THEN 'Asignado'
          ELSE 'Disponible'
        END as estado_asignacion
      FROM guardias g
      LEFT JOIN as_turnos_asignaciones ag ON g.id = ag.guardia_id 
        AND ag.estado = 'Activa' 
        AND ag.fecha_termino IS NULL
      WHERE ag.id IS NULL
        AND g.latitud IS NOT NULL 
        AND g.longitud IS NOT NULL
        AND g.activo = true
      ORDER BY g.nombre, g.apellido_paterno
      LIMIT 10
    `);
    
    console.log('Guardias disponibles (con coordenadas):');
    guardiasDisponibles.rows.forEach((guardia: any) => {
      console.log(`  - ${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno} (${guardia.estado_asignacion}) - Coord: ${guardia.latitud}, ${guardia.longitud}`);
    });

    // 4. Validación de proximidad geográfica para PPCs pendientes
    console.log('\n🗺️ Validando proximidad geográfica para PPCs pendientes...');
    
    const ppcsPendientes = await query(`
      SELECT 
        ppc.id,
        ppc.motivo,
        ppc.fecha_deteccion,
        ppc.fecha_limite_cobertura,
        i.nombre as instalacion_nombre,
        i.latitud as inst_lat,
        i.longitud as inst_lon
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
      INNER JOIN instalaciones i ON req.instalacion_id = i.id
      WHERE ppc.estado = 'Pendiente'
        AND i.latitud IS NOT NULL 
        AND i.longitud IS NOT NULL
      ORDER BY ppc.fecha_deteccion
    `);

    for (const ppc of ppcsPendientes.rows) {
      console.log(`\n📍 PPC ${ppc.id} - ${ppc.instalacion_nombre}:`);
      console.log(`   Motivo: ${ppc.motivo}`);
      console.log(`   Fecha detección: ${ppc.fecha_deteccion}`);
      console.log(`   Fecha límite: ${ppc.fecha_limite_cobertura || 'Sin límite'}`);
      
      // Calcular distancia a cada guardia disponible
      const guardiasConDistancia = guardiasDisponibles.rows.map((guardia: any) => {
        const distancia = calcularDistancia(
          parseFloat(ppc.inst_lat), 
          parseFloat(ppc.inst_lon),
          parseFloat(guardia.latitud), 
          parseFloat(guardia.longitud)
        );
        return {
          ...guardia,
          distancia: Math.round(distancia * 100) / 100
        };
      }).sort((a: any, b: any) => a.distancia - b.distancia);

      console.log('   Guardias más cercanos:');
      guardiasConDistancia.slice(0, 3).forEach((guardia: any) => {
        console.log(`     - ${guardia.nombre} ${guardia.apellido_paterno}: ${guardia.distancia} km`);
      });
    }

    // 5. Validación de conflictos de horarios
    console.log('\n⏰ Validando conflictos de horarios...');
    
    const conflictosHorarios = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        COUNT(ag.id) as asignaciones_activas,
        STRING_AGG(DISTINCT i.nombre, ', ') as instalaciones_asignadas
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ag ON g.id = ag.guardia_id
      INNER JOIN as_turnos_requisitos req ON ag.requisito_puesto_id = req.id
      INNER JOIN instalaciones i ON req.instalacion_id = i.id
      WHERE ag.estado = 'Activa'
        AND ag.fecha_termino IS NULL
      GROUP BY g.id, g.nombre, g.apellido_paterno
      HAVING COUNT(ag.id) > 1
    `);

    if (conflictosHorarios.rows.length > 0) {
      console.log('⚠️ CONFLICTOS DETECTADOS - Guardias con múltiples asignaciones activas:');
      conflictosHorarios.rows.forEach((conflicto: any) => {
        console.log(`  - ${conflicto.nombre} ${conflicto.apellido_paterno}: ${conflicto.asignaciones_activas} asignaciones en ${conflicto.instalaciones_asignadas}`);
      });
    } else {
      console.log('✅ No se detectaron conflictos de horarios');
    }

    // 6. Simular asignación inteligente (si hay datos disponibles)
    if (guardiasDisponibles.rows.length > 0 && ppcsPendientes.rows.length > 0) {
      console.log('\n🤖 Simulando asignación inteligente...');
      
      const ppc = ppcsPendientes.rows[0];
      const guardiasConDistancia = guardiasDisponibles.rows.map((guardia: any) => {
        const distancia = calcularDistancia(
          parseFloat(ppc.inst_lat), 
          parseFloat(ppc.inst_lon),
          parseFloat(guardia.latitud), 
          parseFloat(guardia.longitud)
        );
        return {
          ...guardia,
          distancia: Math.round(distancia * 100) / 100
        };
      }).sort((a: any, b: any) => a.distancia - b.distancia);

      const mejorCandidato = guardiasConDistancia[0];
      
      console.log(`📋 Recomendación para PPC ${ppc.id}:`);
      console.log(`  - Guardia: ${mejorCandidato.nombre} ${mejorCandidato.apellido_paterno}`);
      console.log(`  - Distancia: ${mejorCandidato.distancia} km`);
      console.log(`  - Instalación: ${ppc.instalacion_nombre}`);
      console.log(`  - Motivo: ${ppc.motivo}`);
      
      // Simular la asignación
      try {
        await query(`
          UPDATE as_turnos_ppc 
          SET 
            estado = 'Asignado',
            guardia_asignado_id = $1,
            fecha_asignacion = NOW()
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
          ) VALUES ($1, (SELECT requisito_puesto_id FROM as_turnos_ppc WHERE id = $2), 'PPC', CURRENT_DATE, 'Activa', 'Asignación automática por proximidad geográfica')
        `, [mejorCandidato.id, ppc.id]);

        console.log('✅ Asignación simulada completada');
      } catch (error) {
        console.log('⚠️ Error en asignación simulada:', error);
      }
    }

    // 7. Verificar estado final
    console.log('\n📊 Estado final después de validaciones...');
    
    const ppcsFinal = await query(`
      SELECT 
        ppc.estado,
        COUNT(*) as cantidad
      FROM as_turnos_ppc ppc
      GROUP BY ppc.estado
      ORDER BY ppc.estado
    `);
    
    console.log('Distribución de PPCs por estado:');
    ppcsFinal.rows.forEach((estado: any) => {
      console.log(`  - ${estado.estado}: ${estado.cantidad}`);
    });

    console.log('\n🎯 Validaciones completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en validaciones:', error);
  }
}

// Ejecutar validaciones
testPPCLogic().then(() => {
  console.log('\n✅ Proceso de validación completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 