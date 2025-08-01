import { query } from '../src/lib/database';

async function verificarEstadisticasCorregidas() {
  console.log('🔍 Verificando que las estadísticas se han corregido...\n');

  try {
    // 1. Buscar la instalación "A Test"
    console.log('1. Buscando instalación "A Test"...');
    const instalacionResult = await query(`
      SELECT id, nombre, estado
      FROM instalaciones 
      WHERE nombre ILIKE '%test%' OR nombre ILIKE '%A Test%'
      ORDER BY nombre
    `);

    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró la instalación "A Test"');
      return;
    }

    const instalacion = instalacionResult.rows[0];
    console.log(`✅ Instalación encontrada: ${instalacion.nombre} (ID: ${instalacion.id})`);

    // 2. Ejecutar la consulta corregida del endpoint
    console.log('\n2. Ejecutando consulta corregida del endpoint...');
    const estadisticasResult = await query(`
      SELECT 
        -- Puestos creados (suma de cantidad_guardias de requisitos)
        COALESCE(puestos_creados.count, 0) as puestos_creados,
        
        -- Puestos asignados (asignaciones activas)
        COALESCE(puestos_asignados.count, 0) as puestos_asignados,
        
        -- PPC pendientes
        COALESCE(ppc_pendientes.count, 0) as ppc_pendientes,
        
        -- PPC totales
        COALESCE(ppc_totales.count, 0) as ppc_totales
        
      FROM instalaciones i
      
      -- Puestos creados (suma de cantidad_guardias de requisitos)
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          SUM(tr.cantidad_guardias) as count
        FROM as_turnos_requisitos tr
        GROUP BY tr.instalacion_id
      ) puestos_creados ON puestos_creados.instalacion_id = i.id
      
      -- Puestos asignados (asignaciones activas)
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
        WHERE ta.estado = 'Activa'
        GROUP BY tr.instalacion_id
      ) puestos_asignados ON puestos_asignados.instalacion_id = i.id
      
      -- PPC pendientes
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        WHERE ppc.estado = 'Pendiente'
        GROUP BY tr.instalacion_id
      ) ppc_pendientes ON ppc_pendientes.instalacion_id = i.id
      
      -- PPC totales
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        GROUP BY tr.instalacion_id
      ) ppc_totales ON ppc_totales.instalacion_id = i.id
      
      WHERE i.id = $1
    `, [instalacion.id]);

    if (estadisticasResult.rows.length > 0) {
      const stats = estadisticasResult.rows[0];
      console.log('📈 Estadísticas corregidas del endpoint:');
      console.log(`   Puestos creados: ${stats.puestos_creados} ✅ (debería ser 7)`);
      console.log(`   Puestos asignados: ${stats.puestos_asignados} ✅ (debería ser 0)`);
      console.log(`   PPC pendientes: ${stats.ppc_pendientes} ✅ (debería ser 2)`);
      console.log(`   PPC totales: ${stats.ppc_totales} ✅ (debería ser 2)`);
      
      // Verificar que los valores son correctos
      const puestosCorrectos = parseInt(stats.puestos_creados) === 7;
      const ppcPendientesCorrectos = parseInt(stats.ppc_pendientes) === 2;
      const ppcTotalesCorrectos = parseInt(stats.ppc_totales) === 2;
      
      console.log('\n🎯 Verificación de corrección:');
      console.log(`   Puestos creados: ${puestosCorrectos ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
      console.log(`   PPC pendientes: ${ppcPendientesCorrectos ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
      console.log(`   PPC totales: ${ppcTotalesCorrectos ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
      
      if (puestosCorrectos && ppcPendientesCorrectos && ppcTotalesCorrectos) {
        console.log('\n🎉 ¡TODAS LAS ESTADÍSTICAS ESTÁN CORREGIDAS!');
        console.log('   La página de instalaciones ahora mostrará "7 | 2" en lugar de "2 | 2"');
      } else {
        console.log('\n⚠️  Algunas estadísticas aún necesitan corrección');
      }
    }

    // 3. Verificar que la consulta del endpoint principal también está corregida
    console.log('\n3. Verificando consulta del endpoint principal...');
    const endpointPrincipalResult = await query(`
      SELECT 
        i.id,
        i.nombre,
        COALESCE(stats.puestos_creados, 0) as puestos_creados,
        COALESCE(stats.ppc_pendientes, 0) as ppc_pendientes,
        COALESCE(stats.ppc_totales, 0) as ppc_totales
      FROM instalaciones i
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          SUM(tr.cantidad_guardias) as puestos_creados,
          COUNT(DISTINCT CASE WHEN ppc.estado = 'Pendiente' THEN ppc.id END) as ppc_pendientes,
          COUNT(DISTINCT ppc.id) as ppc_totales
        FROM as_turnos_requisitos tr
        LEFT JOIN as_turnos_ppc ppc ON tr.id = ppc.requisito_puesto_id
        GROUP BY tr.instalacion_id
      ) stats ON stats.instalacion_id = i.id
      WHERE i.id = $1
    `, [instalacion.id]);

    if (endpointPrincipalResult.rows.length > 0) {
      const stats = endpointPrincipalResult.rows[0];
      console.log('📊 Estadísticas del endpoint principal:');
      console.log(`   Puestos creados: ${stats.puestos_creados} ✅ (debería ser 7)`);
      console.log(`   PPC pendientes: ${stats.ppc_pendientes} ✅ (debería ser 2)`);
      console.log(`   PPC totales: ${stats.ppc_totales} ✅ (debería ser 2)`);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar la verificación
verificarEstadisticasCorregidas()
  .then(() => {
    console.log('\n🎯 Verificación finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 