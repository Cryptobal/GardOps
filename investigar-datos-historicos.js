// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function investigarDatosHistoricos() {
  console.log('🔍 Investigando datos históricos del Central de Monitoreo...\n');

  try {
    // 1. Verificar todos los llamados históricos
    console.log('1. Verificando todos los llamados históricos...');
    const llamadosHistoricos = await sql`
      SELECT 
        cl.id,
        cl.instalacion_id,
        i.nombre as instalacion_nombre,
        cl.programado_para,
        cl.estado,
        cl.observaciones
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      ORDER BY cl.programado_para DESC
      LIMIT 20
    `;

    console.log(`✅ Últimos 20 llamados históricos:`);
    llamadosHistoricos.rows.forEach((llamado, index) => {
      console.log(`   ${index + 1}. ${llamado.instalacion_nombre}: ${llamado.estado} (${llamado.programado_para})`);
    });

    // 2. Buscar específicamente Caicoma y Chañaral en datos históricos
    console.log('\n2. Buscando Caicoma y Chañaral en datos históricos...');
    const caicomaChañaralHistoricos = await sql`
      SELECT 
        cl.id,
        cl.instalacion_id,
        i.nombre as instalacion_nombre,
        cl.programado_para,
        cl.estado,
        cl.observaciones
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE i.nombre ILIKE '%caicoma%' OR i.nombre ILIKE '%chañaral%'
      ORDER BY cl.programado_para DESC
    `;

    console.log(`✅ Caicoma/Chañaral en datos históricos: ${caicomaChañaralHistoricos.rows.length}`);
    caicomaChañaralHistoricos.rows.forEach((llamado, index) => {
      console.log(`   ${index + 1}. ${llamado.instalacion_nombre}: ${llamado.estado} (${llamado.programado_para})`);
      if (llamado.observaciones) {
        console.log(`      Observaciones: ${llamado.observaciones}`);
      }
    });

    // 3. Verificar qué instalaciones tienen más llamados históricos
    console.log('\n3. Instalaciones con más llamados históricos...');
    const instalacionesConMasLlamados = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN cl.estado = 'exitoso' THEN 1 END) as exitosos,
        COUNT(CASE WHEN cl.estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN cl.estado = 'no_contesta' THEN 1 END) as no_contesta
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      GROUP BY i.nombre
      ORDER BY total_llamados DESC
      LIMIT 10
    `;

    console.log(`✅ Top 10 instalaciones con más llamados:`);
    instalacionesConMasLlamados.rows.forEach((inst, index) => {
      console.log(`   ${index + 1}. ${inst.instalacion_nombre}: ${inst.total_llamados} total (${inst.exitosos} exitosos, ${inst.pendientes} pendientes, ${inst.no_contesta} no contesta)`);
    });

    // 4. Verificar fechas específicas donde aparecen Caicoma/Chañaral
    console.log('\n4. Verificando fechas específicas...');
    const fechasConCaicomaChañaral = await sql`
      SELECT DISTINCT
        DATE(cl.programado_para) as fecha,
        COUNT(*) as total_llamados
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE i.nombre ILIKE '%caicoma%' OR i.nombre ILIKE '%chañaral%'
      GROUP BY DATE(cl.programado_para)
      ORDER BY fecha DESC
    `;

    console.log(`✅ Fechas con Caicoma/Chañaral:`);
    fechasConCaicomaChañaral.rows.forEach(fecha => {
      console.log(`   - ${fecha.fecha}: ${fecha.total_llamados} llamados`);
    });

    // 5. Verificar si hay datos de prueba o de desarrollo
    console.log('\n5. Verificando datos de prueba...');
    const datosPrueba = await sql`
      SELECT 
        cl.id,
        i.nombre as instalacion_nombre,
        cl.programado_para,
        cl.estado,
        cl.observaciones
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE cl.observaciones ILIKE '%test%' 
         OR cl.observaciones ILIKE '%prueba%'
         OR cl.observaciones ILIKE '%demo%'
         OR i.nombre ILIKE '%test%'
      ORDER BY cl.programado_para DESC
      LIMIT 10
    `;

    console.log(`✅ Datos de prueba encontrados: ${datosPrueba.rows.length}`);
    datosPrueba.rows.forEach((dato, index) => {
      console.log(`   ${index + 1}. ${dato.instalacion_nombre}: ${dato.estado} (${dato.programado_para})`);
      if (dato.observaciones) {
        console.log(`      Observaciones: ${dato.observaciones}`);
      }
    });

    console.log('\n🎯 CONCLUSIÓN DE LA INVESTIGACIÓN HISTÓRICA:');
    console.log('==============================================');
    
    if (caicomaChañaralHistoricos.rows.length > 0) {
      console.log('❌ PROBLEMA IDENTIFICADO:');
      console.log('   - Hay datos históricos de Caicoma/Chañaral en central_llamados');
      console.log('   - Estos datos pueden estar apareciendo en la interfaz');
      console.log('   - RECOMENDACIÓN: Limpiar datos históricos de prueba');
    } else {
      console.log('✅ NO HAY PROBLEMA HISTÓRICO:');
      console.log('   - No se encontraron datos históricos de Caicoma/Chañaral');
      console.log('   - El problema puede estar en la interfaz o en otra parte');
    }

  } catch (error) {
    console.error('❌ Error en la investigación histórica:', error);
  } finally {
    process.exit(0);
  }
}

investigarDatosHistoricos();
