// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function verificarVistaTurnosActivos() {
  console.log('🔍 Verificando vista central_v_turnos_activos...\n');

  try {
    // 1. Verificar la definición de la vista
    console.log('1. Verificando definición de la vista...');
    const definicionVista = await sql`
      SELECT 
        view_definition
      FROM information_schema.views 
      WHERE table_name = 'central_v_turnos_activos'
        AND table_schema = 'public'
    `;

    console.log(`✅ Definición de la vista:`);
    if (definicionVista.rows.length > 0) {
      console.log(definicionVista.rows[0].view_definition);
    } else {
      console.log('   - Vista no encontrada');
    }

    // 2. Verificar qué estados incluye la vista
    console.log('\n2. Verificando qué estados incluye la vista...');
    const estadosEnVista = await sql`
      SELECT DISTINCT pm.estado
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.estado IN ('planificado', 'trabajado', 'libre')
      ORDER BY pm.estado
    `;

    console.log(`✅ Estados que podrían estar en la vista:`);
    estadosEnVista.rows.forEach(estado => {
      console.log(`   - "${estado.estado}"`);
    });

    // 3. Probar la vista con diferentes estados
    console.log('\n3. Probando la vista con estado "planificado"...');
    const vistaConPlanificado = await sql`
      SELECT 
        instalacion_nombre,
        guardia_nombre,
        rol_nombre,
        hora_inicio,
        hora_termino,
        monitoreo_habilitado
      FROM central_v_turnos_activos
      ORDER BY instalacion_nombre, hora_inicio
    `;

    console.log(`✅ Resultados con estado actual: ${vistaConPlanificado.rows.length}`);
    vistaConPlanificado.rows.forEach(turno => {
      console.log(`   - ${turno.instalacion_nombre}: ${turno.guardia_nombre} (${turno.rol_nombre}) ${turno.hora_inicio}-${turno.hora_termino}`);
    });

    // 4. Verificar qué estado debería usar
    console.log('\n4. Verificando qué estado debería usar...');
    const estadoRecomendado = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025
        AND pm.mes = 8
        AND pm.dia = 29
        AND po.activo = true
        AND pm.estado IN ('planificado', 'trabajado')
      GROUP BY pm.estado
      ORDER BY pm.estado
    `;

    console.log(`✅ Estados recomendados del día anterior:`);
    estadoRecomendado.rows.forEach(estado => {
      console.log(`   - ${estado.estado}: ${estado.cantidad} registros`);
    });

    console.log('\n🎯 ANÁLISIS DE LA VISTA:');
    console.log('========================');
    
    if (vistaConPlanificado.rows.length > 0) {
      console.log('✅ La vista SÍ funciona con el estado actual');
      console.log('   - Los turnos aparecen en la vista');
      console.log('   - El problema puede ser otro');
    } else {
      console.log('❌ La vista NO funciona con el estado actual');
      console.log('   - No hay turnos en la vista');
      console.log('   - Necesitamos cambiar el estado');
    }

    console.log('\n🔧 RECOMENDACIONES:');
    console.log('==================');
    console.log('1. Cambiar el estado a "trabajado" en lugar de "Activo"');
    console.log('2. Verificar si "planificado" también funciona');
    console.log('3. Probar con diferentes estados permitidos');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  } finally {
    process.exit(0);
  }
}

verificarVistaTurnosActivos();
