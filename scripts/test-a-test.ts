import { query } from '../src/lib/database';

async function testInstalacionATest() {
  try {
    console.log('🧪 Probando instalación A Test...');
    
    const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';
    
    // Obtener todos los puestos de A Test
    const puestos = await query(`
      SELECT po.id as puesto_id, po.guardia_id, po.nombre_puesto, po.es_ppc, g.nombre as guardia_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`📋 Puestos en A Test: ${puestos.rows.length}`);
    puestos.rows.forEach((puesto: any, index: number) => {
      console.log(`  ${index + 1}. ${puesto.nombre_puesto} - ${puesto.guardia_nombre || 'PPC'} (${puesto.es_ppc ? 'PPC' : 'Guardia'})`);
      console.log(`     Puesto ID: ${puesto.puesto_id}`);
      console.log(`     Guardia ID: ${puesto.guardia_id || 'null'}`);
    });
    
    // Crear datos de prueba para TODOS los puestos (incluyendo PPCs)
    const pautaTest = puestos.rows.map((puesto: any) => ({
      guardia_id: puesto.guardia_id || puesto.puesto_id, // Para PPCs usar puesto_id
      dias: Array.from({ length: 31 }, (_, i) => {
        const dia = i + 1;
        return dia % 2 === 0 ? 'T' : 'L';
      })
    }));
    
    console.log(`📋 Datos de prueba creados: ${pautaTest.length} puestos (incluyendo PPCs)`);
    pautaTest.forEach((pauta: any, index: number) => {
      console.log(`  ${index + 1}. Guardia ID: ${pauta.guardia_id} - ${pauta.dias.filter((d: string) => d === 'T').length} días trabajando`);
    });
    
    // Probar el endpoint
    const response = await fetch('http://localhost:3000/api/pauta-mensual/guardar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instalacion_id: instalacionId,
        anio: 2025,
        mes: 8,
        pauta: pautaTest
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Guardado exitoso:', result);
    } else {
      console.log('❌ Error al guardar:', result);
    }
    
    // Verificar datos guardados
    const datosGuardados = await query(`
      SELECT pm.*, po.nombre_puesto, po.es_ppc, g.nombre as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1
        AND pm.anio = 2025 AND pm.mes = 8
      ORDER BY po.nombre_puesto, pm.dia
      LIMIT 10
    `, [instalacionId]);
    
    console.log('\n📋 Datos guardados:');
    datosGuardados.rows.forEach((row: any) => {
      const tipo = row.es_ppc ? 'PPC' : 'Guardia';
      const nombre = row.guardia_nombre || 'PPC';
      console.log(`  - ${row.nombre_puesto} (${tipo}: ${nombre}) - Día ${row.dia}: ${row.estado}`);
    });
    
    // Contar por tipo
    const conteo = await query(`
      SELECT po.es_ppc, COUNT(*) as total
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1
        AND pm.anio = 2025 AND pm.mes = 8
      GROUP BY po.es_ppc
    `, [instalacionId]);
    
    console.log('\n📊 Resumen por tipo:');
    conteo.rows.forEach((row: any) => {
      const tipo = row.es_ppc ? 'PPCs' : 'Guardias';
      console.log(`  - ${tipo}: ${row.total} registros`);
    });
    
  } catch (error) {
    console.error('💥 Error en la prueba:', error);
  }
}

testInstalacionATest()
  .then(() => {
    console.log('✅ Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  }); 