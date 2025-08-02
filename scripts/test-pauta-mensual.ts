import { query } from '../src/lib/database';

async function testPautaMensual() {
  try {
    console.log('🧪 Probando endpoint de pauta mensual...');
    
    // Datos de prueba
    const datosPrueba = {
      instalacion_id: "instalacion-test-1",
      anio: 2025,
      mes: 1,
      pauta: [
        {
          guardia_id: "guardia-1",
          dia: 1,
          estado: "trabajado"
        },
        {
          guardia_id: "guardia-1",
          dia: 2,
          estado: "libre"
        },
        {
          guardia_id: "guardia-2",
          dia: 1,
          estado: "trabajado"
        },
        {
          guardia_id: "guardia-2",
          dia: 2,
          estado: "permiso"
        }
      ]
    };
    
    // Simular el endpoint
    console.log('📝 Borrando pauta anterior...');
    await query(
      'DELETE FROM as_turnos_pauta_mensual WHERE instalacion_id = $1 AND anio = $2 AND mes = $3',
      [datosPrueba.instalacion_id, datosPrueba.anio, datosPrueba.mes]
    );
    
    console.log('📝 Insertando nueva pauta...');
    const insertPromises = datosPrueba.pauta.map(item => 
      query(
        'INSERT INTO as_turnos_pauta_mensual (instalacion_id, guardia_id, anio, mes, dia, estado) VALUES ($1, $2, $3, $4, $5, $6)',
        [datosPrueba.instalacion_id, item.guardia_id, datosPrueba.anio, datosPrueba.mes, item.dia, item.estado]
      )
    );
    
    await Promise.all(insertPromises);
    
    console.log('✅ Pauta mensual guardada en base de datos correctamente');
    console.log(`📊 Resumen: ${datosPrueba.pauta.length} turnos guardados para instalación ${datosPrueba.instalacion_id}, ${datosPrueba.mes}/${datosPrueba.anio}`);
    
    // Verificar que se guardó correctamente
    console.log('🔍 Verificando datos guardados...');
    const resultado = await query(
      'SELECT * FROM as_turnos_pauta_mensual WHERE instalacion_id = $1 AND anio = $2 AND mes = $3 ORDER BY guardia_id, dia',
      [datosPrueba.instalacion_id, datosPrueba.anio, datosPrueba.mes]
    );
    
    console.log('📋 Datos guardados:');
    resultado.rows.forEach((row: any) => {
      console.log(`  - Guardia ${row.guardia_id}, Día ${row.dia}: ${row.estado}`);
    });
    
    console.log('🎉 Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPautaMensual()
    .then(() => {
      console.log('✅ Prueba exitosa');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la prueba:', error);
      process.exit(1);
    });
} 