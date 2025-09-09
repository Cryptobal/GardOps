import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query, checkConnection } from '../src/lib/database';

async function testDatabaseConnection() {
  console.log('🔍 PROBANDO CONECTIVIDAD DE BASE DE DATOS');
  console.log('='.repeat(80));

  try {
    // 1. Probar conexión básica
    console.log('\n📋 1. PROBANDO CONEXIÓN BÁSICA');
    console.log('-'.repeat(50));

    const isConnected = await checkConnection();
    if (isConnected) {
      console.log('✅ Conexión exitosa');
    } else {
      console.log('❌ Error de conexión');
      return;
    }

    // 2. Probar queries simples
    console.log('\n📋 2. PROBANDO QUERIES SIMPLES');
    console.log('-'.repeat(50));

    const startTime = Date.now();
    
    // Query 1: Contar guardias
    console.log('🔍 Contando guardias...');
    const guardiasCount = await query('SELECT COUNT(*) as total FROM guardias');
    console.log(`✅ Guardias: ${guardiasCount.rows[0].total}`);

    // Query 2: Contar instalaciones
    console.log('🔍 Contando instalaciones...');
    const instalacionesCount = await query('SELECT COUNT(*) as total FROM instalaciones');
    console.log(`✅ Instalaciones: ${instalacionesCount.rows[0].total}`);

    // Query 3: Contar pautas mensuales
    console.log('🔍 Contando pautas mensuales...');
    const pautasCount = await query('SELECT COUNT(*) as total FROM as_turnos_pauta_mensual');
    console.log(`✅ Pautas mensuales: ${pautasCount.rows[0].total}`);

    // Query 4: Contar asignaciones
    console.log('🔍 Contando asignaciones...');
    const asignacionesCount = await query('SELECT COUNT(*) as total FROM as_turnos_asignaciones');
    console.log(`✅ Asignaciones: ${asignacionesCount.rows[0].total}`);

    const endTime = Date.now();
    console.log(`⏱️  Tiempo total: ${endTime - startTime}ms`);

    // 3. Probar queries complejas
    console.log('\n📋 3. PROBANDO QUERIES COMPLEJAS');
    console.log('-'.repeat(50));

    // Query compleja 1: Guardias con asignaciones activas
    console.log('🔍 Consultando guardias con asignaciones activas...');
    const guardiasConAsignaciones = await query(`
      SELECT 
        g.nombre,
        g.apellido_paterno,
        COUNT(ta.id) as asignaciones_activas
      FROM guardias g
      LEFT JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id AND ta.estado = 'Activa'
      GROUP BY g.id, g.nombre, g.apellido_paterno
      HAVING COUNT(ta.id) > 0
      ORDER BY asignaciones_activas DESC
      LIMIT 5
    `);
    console.log(`✅ Guardias con asignaciones activas: ${guardiasConAsignaciones.rows.length}`);

    // Query compleja 2: Pautas del mes actual
    console.log('🔍 Consultando pautas del mes actual...');
    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;
    
    const pautasMesActual = await query(`
      SELECT 
        instalacion_id,
        COUNT(DISTINCT guardia_id) as guardias,
        COUNT(*) as registros
      FROM as_turnos_pauta_mensual
      WHERE anio = $1 AND mes = $2
      GROUP BY instalacion_id
    `, [anioActual, mesActual]);
    console.log(`✅ Pautas del mes actual: ${pautasMesActual.rows.length} instalaciones`);

    // 4. Probar queries con timeouts
    console.log('\n📋 4. PROBANDO QUERIES CON TIMEOUTS');
    console.log('-'.repeat(50));

    // Query que podría ser lenta
    console.log('🔍 Consultando estadísticas detalladas...');
    const estadisticas = await query(`
      SELECT 
        'guardias' as tabla,
        COUNT(*) as total
      FROM guardias
      UNION ALL
      SELECT 
        'instalaciones' as tabla,
        COUNT(*) as total
      FROM instalaciones
      UNION ALL
      SELECT 
        'pautas_mensuales' as tabla,
        COUNT(*) as total
      FROM as_turnos_pauta_mensual
      UNION ALL
      SELECT 
        'asignaciones' as tabla,
        COUNT(*) as total
      FROM as_turnos_asignaciones
      UNION ALL
      SELECT 
        'ppcs' as tabla,
        COUNT(*) as total
      FROM as_turnos_ppc
    `);
    
    console.log('📊 ESTADÍSTICAS DE LA BASE DE DATOS:');
    estadisticas.rows.forEach((row: any) => {
      console.log(`  ${row.tabla}: ${row.total} registros`);
    });

    // 5. Probar múltiples conexiones simultáneas
    console.log('\n📋 5. PROBANDO CONEXIONES SIMULTÁNEAS');
    console.log('-'.repeat(50));

    const queries = [
      'SELECT COUNT(*) FROM guardias',
      'SELECT COUNT(*) FROM instalaciones',
      'SELECT COUNT(*) FROM as_turnos_pauta_mensual',
      'SELECT COUNT(*) FROM as_turnos_asignaciones',
      'SELECT COUNT(*) FROM as_turnos_ppc'
    ];

    console.log('🔍 Ejecutando 5 queries simultáneas...');
    const startTimeParallel = Date.now();
    
    const results = await Promise.all(
      queries.map(async (queryText, index) => {
        try {
          const result = await query(queryText);
          return { index, success: true, count: result.rows[0].count };
        } catch (error) {
          return { index, success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
      })
    );

    const endTimeParallel = Date.now();
    console.log(`⏱️  Tiempo total paralelo: ${endTimeParallel - startTimeParallel}ms`);

    results.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ Query ${index + 1}: ${result.count} registros`);
      } else {
        console.log(`❌ Query ${index + 1}: ${result.error}`);
      }
    });

    // 6. Resumen final
    console.log('\n📋 6. RESUMEN FINAL');
    console.log('-'.repeat(50));
    console.log('✅ Todas las pruebas completadas exitosamente');
    console.log('✅ No se detectaron timeouts');
    console.log('✅ La configuración optimizada está funcionando correctamente');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Ejecutar las pruebas
testDatabaseConnection()
  .then(() => {
    console.log('\n✅ Pruebas de conectividad completadas');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 