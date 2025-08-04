import { query } from '../src/lib/database';

async function testGuardarPauta() {
  try {
    console.log('🧪 Probando endpoint de guardar pauta mensual...\n');

    // 1. Buscar la instalación "A Test"
    console.log('1. Buscando instalación "A Test"...');
    const instalacionResult = await query(`
      SELECT id, nombre, estado FROM instalaciones 
      WHERE nombre ILIKE '%A Test%'
    `);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró la instalación "A Test"');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`✅ Instalación encontrada: ${instalacion.nombre} (${instalacion.id})`);

    // 2. Verificar puestos operativos
    console.log('\n2. Verificando puestos operativos...');
    const puestosResult = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion.id]);

    console.log(`📊 Puestos encontrados: ${puestosResult.rows.length}`);
    puestosResult.rows.forEach((puesto: any, index: number) => {
      console.log(`  Puesto ${index + 1}:`);
      console.log(`    ID: ${puesto.puesto_id}`);
      console.log(`    Nombre: ${puesto.nombre_puesto}`);
      console.log(`    Es PPC: ${puesto.es_ppc ? 'SÍ' : 'NO'}`);
      console.log(`    Guardia asignada: ${puesto.guardia_id ? 'SÍ' : 'NO'}`);
      if (puesto.guardia_id) {
        console.log(`    Guardia: ${puesto.guardia_nombre} ${puesto.apellido_paterno} ${puesto.apellido_materno}`);
      }
    });

    // 3. Simular datos del frontend
    console.log('\n3. Simulando datos del frontend...');
    const anio = 2025;
    const mes = 8;
    const diasDelMes = new Date(anio, mes, 0).getDate();
    
    // Crear pauta simulando el frontend
    const pautaFrontend = [];
    
    for (const puesto of puestosResult.rows) {
      const guardiaId = puesto.guardia_id || puesto.puesto_id; // Para PPCs usar puesto_id
      const dias = Array.from({ length: diasDelMes }, (_, i) => {
        // Simular algunos días trabajados y otros libres
        const dia = i + 1;
        if (puesto.es_ppc) {
          return 'L'; // PPCs siempre libres por defecto
        } else {
          // Para guardias normales, alternar entre trabajado y libre
          return dia % 2 === 0 ? 'T' : 'L';
        }
      });
      
      pautaFrontend.push({
        guardia_id: guardiaId,
        dias: dias
      });
      
      console.log(`   ✅ Agregado: ${puesto.nombre_puesto} (${puesto.es_ppc ? 'PPC' : 'Guardia'}) - ${dias.filter(d => d === 'T').length} días trabajados`);
    }

    console.log(`\n📊 Resumen de pauta a enviar:`);
    console.log(`   - Total guardias/PPCs: ${pautaFrontend.length}`);
    console.log(`   - Días por guardia: ${diasDelMes}`);
    console.log(`   - Total registros: ${pautaFrontend.length * diasDelMes}`);

    // 4. Simular la llamada al endpoint
    console.log('\n4. Simulando llamada al endpoint de guardar...');
    
    // Simular el body que enviaría el frontend
    const body = {
      instalacion_id: instalacion.id,
      anio: anio,
      mes: mes,
      pauta: pautaFrontend
    };

    console.log('   📤 Body enviado:', JSON.stringify(body, null, 2));

    // 5. Verificar estado actual de la base de datos
    console.log('\n5. Verificando estado actual de la base de datos...');
    const pautaActual = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT pm.puesto_id) as puestos_unicos,
        COUNT(DISTINCT pm.guardia_id) as guardias_unicas
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion.id, anio, mes]);

    const actual = pautaActual.rows[0];
    console.log(`   - Registros actuales: ${actual.total_registros}`);
    console.log(`   - Puestos únicos: ${actual.puestos_unicos}`);
    console.log(`   - Guardias únicas: ${actual.guardias_unicas}`);

    console.log('\n✅ Prueba completada exitosamente');
    console.log('\n💡 Para probar el endpoint real, ejecuta:');
    console.log(`   curl -X POST http://localhost:3000/api/pauta-mensual/guardar \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '${JSON.stringify(body)}'`);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    process.exit(0);
  }
}

testGuardarPauta(); 