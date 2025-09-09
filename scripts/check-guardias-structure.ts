import { query } from '../src/lib/database';

async function checkGuardiasStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE GUARDIAS\n');

  try {
    // Verificar estructura
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias'
      ORDER BY ordinal_position
    `);
    
    console.log('   Campos encontrados:');
    structure.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // Verificar datos de ejemplo
    const sampleData = await query(`
      SELECT id, nombre, apellido_paterno, apellido_materno, rut
      FROM guardias
      LIMIT 3
    `);

    console.log('\n   Datos de ejemplo:');
    sampleData.rows.forEach((row: any) => {
      const nombreCompleto = `${row.nombre} ${row.apellido_paterno} ${row.apellido_materno || ''}`.trim();
      console.log(`   - ${nombreCompleto} (${row.rut})`);
    });

  } catch (error) {
    console.error('Error verificando estructura:', error);
  }
}

checkGuardiasStructure(); 