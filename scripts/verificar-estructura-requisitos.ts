import { query } from '../src/lib/database';

async function verificarEstructuraRequisitos() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE as_turnos_requisitos');
  console.log('==================================================\n');

  try {
    // Verificar estructura de as_turnos_requisitos
    console.log('📋 ESTRUCTURA DE as_turnos_requisitos...');
    
    const estructura = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_requisitos'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas encontradas:');
    estructura.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // Verificar datos en as_turnos_requisitos
    console.log('\n📋 DATOS EN as_turnos_requisitos...');
    
    const datos = await query(`
      SELECT *
      FROM as_turnos_requisitos
      LIMIT 5
    `);
    
    console.log(`Total registros: ${datos.rows.length}`);
    if (datos.rows.length > 0) {
      console.log('Primeros registros:');
      datos.rows.forEach((row: any, index: number) => {
        console.log(`  Registro ${index + 1}:`, row);
      });
    }

    // Verificar estructura de as_turnos_ppc
    console.log('\n📋 ESTRUCTURA DE as_turnos_ppc...');
    
    const estructuraPPC = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_ppc'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas encontradas:');
    estructuraPPC.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // Verificar estructura de as_turnos_asignaciones
    console.log('\n📋 ESTRUCTURA DE as_turnos_asignaciones...');
    
    const estructuraAsignaciones = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_asignaciones'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas encontradas:');
    estructuraAsignaciones.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar verificación
verificarEstructuraRequisitos().then(() => {
  console.log('\n🏁 Verificación finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 