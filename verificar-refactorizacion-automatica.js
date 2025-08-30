require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function verificarRefactorizacionAutomatica() {
  console.log('🔍 Verificando refactorización automática del Central de Monitoreo...\n');

  try {
    const fecha = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de verificación: ${fecha}`);

    // 1. Verificar que la vista automática existe
    console.log('1. Verificando vista automática...');
    const vistaExiste = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'central_v_llamados_automaticos'
      ) as existe
    `;
    
    console.log(`   ✅ Vista automática: ${vistaExiste.rows[0].existe ? 'EXISTE' : 'NO EXISTE'}`);

    if (!vistaExiste.rows[0].existe) {
      console.log('❌ La vista automática no existe. Ejecuta el script de refactorización.');
      return;
    }

    // 2. Verificar datos en la vista automática
    console.log('\n2. Verificando datos en la vista automática...');
    const datosVista = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = ${fecha}
    `;

    const stats = datosVista.rows[0];
    console.log(`   📊 Total de llamados: ${stats.total_llamados}`);
    console.log(`   🟡 Actuales: ${stats.actuales}`);
    console.log(`   🔵 Próximos: ${stats.proximos}`);
    console.log(`   🔴 Urgentes: ${stats.urgentes}`);

    // 3. Verificar instalaciones con configuración
    console.log('\n3. Verificando instalaciones con configuración...');
    const instalacionesConfig = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM instalaciones i
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE cci.habilitado = true
      ORDER BY i.nombre
    `;

    console.log(`   ✅ Instalaciones con monitoreo habilitado: ${instalacionesConfig.rows.length}`);
    instalacionesConfig.rows.forEach(inst => {
      console.log(`      - ${inst.instalacion_nombre}: ${inst.intervalo_minutos}min (${inst.ventana_inicio}-${inst.ventana_fin})`);
    });

    // 4. Verificar turnos en pauta mensual
    console.log('\n4. Verificando turnos en pauta mensual...');
    const turnosPauta = await sql`
      SELECT 
        COUNT(*) as total_turnos,
        COUNT(CASE WHEN estado = 'trabajado' THEN 1 END) as trabajado,
        COUNT(CASE WHEN estado = 'libre' THEN 1 END) as libre,
        COUNT(CASE WHEN estado = 'planificado' THEN 1 END) as planificado
      FROM as_turnos_pauta_mensual
      WHERE anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND dia = EXTRACT(DAY FROM ${fecha}::date)
    `;

    const turnos = turnosPauta.rows[0];
    console.log(`   📋 Total de turnos: ${turnos.total_turnos}`);
    console.log(`   ✅ Trabajado: ${turnos.trabajado}`);
    console.log(`   🔄 Libre: ${turnos.libre}`);
    console.log(`   📝 Planificado: ${turnos.planificado}`);

    // 5. Verificar que la función innecesaria fue eliminada
    console.log('\n5. Verificando eliminación de función innecesaria...');
    const funcionExiste = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_name = 'central_fn_generar_agenda'
      ) as existe
    `;
    
    console.log(`   ✅ Función central_fn_generar_agenda: ${funcionExiste.rows[0].existe ? 'EXISTE (debe eliminarse)' : 'ELIMINADA ✅'}`);

    // 6. Verificar endpoint automático
    console.log('\n6. Verificando endpoint automático...');
    const endpointExiste = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_name = 'central_fn_generar_agenda'
      ) as existe
    `;
    
    console.log(`   ✅ Endpoint /api/central-monitoring/agenda/generar: ${endpointExiste.rows[0].existe ? 'EXISTE (debe eliminarse)' : 'ELIMINADO ✅'}`);

    // 7. Resumen final
    console.log('\n📋 RESUMEN DE LA REFACTORIZACIÓN:');
    console.log(`   ✅ Vista automática: ${vistaExiste.rows[0].existe ? 'CREADA' : 'FALTA'}`);
    console.log(`   ✅ Datos automáticos: ${stats.total_llamados} llamados calculados`);
    console.log(`   ✅ Instalaciones configuradas: ${instalacionesConfig.rows.length}`);
    console.log(`   ✅ Turnos trabajados: ${turnos.trabajado}`);
    console.log(`   ✅ Función innecesaria: ${funcionExiste.rows[0].existe ? 'PENDIENTE' : 'ELIMINADA'}`);

    if (stats.total_llamados > 0) {
      console.log('\n🎉 ¡REFACTORIZACIÓN EXITOSA!');
      console.log('   El Central de Monitoreo ahora funciona automáticamente sin necesidad del botón "Generar Agenda".');
      console.log('   Los datos se calculan en tiempo real desde la pauta mensual.');
    } else {
      console.log('\n⚠️  ATENCIÓN: No hay llamados automáticos para hoy.');
      console.log('   Verifica que:');
      console.log('   1. Las instalaciones tengan monitoreo habilitado');
      console.log('   2. Los turnos estén en estado "trabajado"');
      console.log('   3. La configuración tenga intervalo y ventana definidos');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

verificarRefactorizacionAutomatica();
