// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function limpiarDatosHistoricos() {
  console.log('🧹 Limpiando datos históricos del Central de Monitoreo...\n');

  try {
    // 1. Verificar datos antes de la limpieza
    console.log('1. Verificando datos antes de la limpieza...');
    const datosAntes = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN i.nombre ILIKE '%caicoma%' OR i.nombre ILIKE '%chañaral%' THEN 1 END) as caicoma_chañaral
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
    `;

    console.log(`✅ Total de llamados antes: ${datosAntes.rows[0].total_llamados}`);
    console.log(`✅ Caicoma/Chañaral antes: ${datosAntes.rows[0].caicoma_chañaral}`);

    // 2. Eliminar llamados de Caicoma y Chañaral
    console.log('\n2. Eliminando llamados de Caicoma y Chañaral...');
    const resultadoEliminacion = await sql`
      DELETE FROM central_llamados 
      WHERE instalacion_id IN (
        SELECT id FROM instalaciones 
        WHERE nombre ILIKE '%caicoma%' OR nombre ILIKE '%chañaral%'
      )
    `;

    console.log(`✅ Llamados eliminados: ${resultadoEliminacion.rowCount}`);

    // 3. Verificar datos después de la limpieza
    console.log('\n3. Verificando datos después de la limpieza...');
    const datosDespues = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN i.nombre ILIKE '%caicoma%' OR i.nombre ILIKE '%chañaral%' THEN 1 END) as caicoma_chañaral
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
    `;

    console.log(`✅ Total de llamados después: ${datosDespues.rows[0].total_llamados}`);
    console.log(`✅ Caicoma/Chañaral después: ${datosDespues.rows[0].caicoma_chañaral}`);

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

    console.log('\n🎯 LIMPIEZA COMPLETADA:');
    console.log('========================');
    console.log(`✅ Se eliminaron ${resultadoEliminacion.rowCount} llamados de Caicoma y Chañaral`);
    console.log(`✅ Quedan ${datosDespues.rows[0].total_llamados} llamados totales`);
    console.log(`✅ Para hoy hay ${datosHoy.rows[0].total_llamados_hoy} llamados`);
    console.log('✅ Ahora el Central de Monitoreo mostrará solo datos reales');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    process.exit(0);
  }
}

limpiarDatosHistoricos();
