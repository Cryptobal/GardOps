import { query } from '../src/lib/database';

async function verificarEstructuraTablas() {
  console.log('🔍 Verificando estructura de tablas de turnos...\n');

  try {
    // Verificar estructura de as_turnos_requisitos
    console.log('1. Estructura de as_turnos_requisitos:');
    const requisitosResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_requisitos'
      ORDER BY ordinal_position
    `);
    
    requisitosResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Verificar estructura de as_turnos_ppc
    console.log('\n2. Estructura de as_turnos_ppc:');
    const ppcResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_ppc'
      ORDER BY ordinal_position
    `);
    
    ppcResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Verificar estructura de as_turnos_asignaciones
    console.log('\n3. Estructura de as_turnos_asignaciones:');
    const asignacionesResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_asignaciones'
      ORDER BY ordinal_position
    `);
    
    asignacionesResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Verificar algunos datos de ejemplo
    console.log('\n4. Datos de ejemplo de as_turnos_requisitos:');
    const ejemploResult = await query(`
      SELECT * FROM as_turnos_requisitos LIMIT 3
    `);
    
    if (ejemploResult.rows.length > 0) {
      console.log('   Columnas disponibles:', Object.keys(ejemploResult.rows[0]));
      ejemploResult.rows.forEach((row, index) => {
        console.log(`   Fila ${index + 1}:`, row);
      });
    } else {
      console.log('   No hay datos en la tabla');
    }

  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  }
}

// Ejecutar la verificación
verificarEstructuraTablas()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 