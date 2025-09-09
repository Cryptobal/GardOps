// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function limpiarATest1() {
  console.log('🧹 Limpiando datos históricos de A Test 1 del Central de Monitoreo...\n');

  try {
    // 1. Verificar datos antes de la limpieza
    console.log('1. Verificando datos antes de la limpieza...');
    const datosAntes = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN i.nombre ILIKE '%a test 1%' THEN 1 END) as a_test_1
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
    `;

    console.log(`✅ Total de llamados antes: ${datosAntes.rows[0].total_llamados}`);
    console.log(`✅ A Test 1 antes: ${datosAntes.rows[0].a_test_1}`);

    // 2. Eliminar llamados de A Test 1
    console.log('\n2. Eliminando llamados de A Test 1...');
    const resultadoEliminacion = await sql`
      DELETE FROM central_llamados 
      WHERE instalacion_id IN (
        SELECT id FROM instalaciones 
        WHERE nombre ILIKE '%a test 1%'
      )
    `;

    console.log(`✅ Llamados eliminados: ${resultadoEliminacion.rowCount}`);

    // 3. Verificar datos después de la limpieza
    console.log('\n3. Verificando datos después de la limpieza...');
    const datosDespues = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN i.nombre ILIKE '%a test 1%' THEN 1 END) as a_test_1
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
    `;

    console.log(`✅ Total de llamados después: ${datosDespues.rows[0].total_llamados}`);
    console.log(`✅ A Test 1 después: ${datosDespues.rows[0].a_test_1}`);

    // 4. Verificar qué instalaciones quedan
    console.log('\n4. Verificando instalaciones restantes...');
    const instalacionesRestantes = await sql`
      SELECT DISTINCT 
        i.nombre as instalacion_nombre,
        COUNT(*) as total_llamados
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      GROUP BY i.nombre
      ORDER BY i.nombre
    `;

    console.log(`✅ Instalaciones con llamados restantes: ${instalacionesRestantes.rows.length}`);
    instalacionesRestantes.rows.forEach(inst => {
      console.log(`   - ${inst.instalacion_nombre}: ${inst.total_llamados} llamados`);
    });

    // 5. Verificar datos del día actual
    const fechaActual = new Date().toISOString().split('T')[0];
    console.log(`\n5. Verificando datos del día actual (${fechaActual})...`);
    const datosHoy = await sql`
      SELECT 
        COUNT(*) as total_llamados_hoy,
        COUNT(CASE WHEN cl.estado = 'pendiente' THEN 1 END) as pendientes_hoy,
        COUNT(CASE WHEN cl.estado = 'exitoso' THEN 1 END) as exitosos_hoy
      FROM central_llamados cl
      WHERE DATE(cl.programado_para) = ${fechaActual}
    `;

    console.log(`✅ Llamados del día actual: ${datosHoy.rows[0].total_llamados_hoy}`);
    console.log(`   - Pendientes: ${datosHoy.rows[0].pendientes_hoy}`);
    console.log(`   - Exitosos: ${datosHoy.rows[0].exitosos_hoy}`);

    // 6. Verificar que solo queden instalaciones de la pauta diaria actual
    console.log('\n6. Verificando que solo queden instalaciones de la pauta diaria...');
    const instalacionesPautaDiaria = await sql`
      SELECT DISTINCT 
        i.nombre as instalacion_nombre,
        COUNT(*) as total_puestos
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fechaActual}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fechaActual}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fechaActual}::date)
        AND po.activo = true
      GROUP BY i.nombre
      ORDER BY i.nombre
    `;

    console.log(`✅ Instalaciones en pauta diaria actual: ${instalacionesPautaDiaria.rows.length}`);
    instalacionesPautaDiaria.rows.forEach(inst => {
      console.log(`   - ${inst.instalacion_nombre}: ${inst.total_puestos} puestos`);
    });

    console.log('\n🎯 LIMPIEZA COMPLETADA:');
    console.log('========================');
    console.log(`✅ Se eliminaron ${resultadoEliminacion.rowCount} llamados de A Test 1`);
    console.log(`✅ Quedan ${datosDespues.rows[0].total_llamados} llamados totales`);
    console.log(`✅ Para hoy hay ${datosHoy.rows[0].total_llamados_hoy} llamados`);
    console.log('✅ Ahora el Central de Monitoreo solo mostrará datos de instalaciones en la pauta diaria actual');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    process.exit(0);
  }
}

limpiarATest1();
