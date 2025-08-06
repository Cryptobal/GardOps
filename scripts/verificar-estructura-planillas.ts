import { query } from '../src/lib/database';

async function verificarEstructuraPlanillas() {
  try {
    console.log('🔍 Verificando estructura de te_planillas_turnos_extras...');
    
    // Verificar si la tabla existe
    const { rows: tableExists } = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'te_planillas_turnos_extras'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('❌ La tabla te_planillas_turnos_extras no existe');
      return;
    }
    
    console.log('✅ La tabla te_planillas_turnos_extras existe');
    
    // Obtener estructura de columnas
    const { rows: columns } = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'te_planillas_turnos_extras'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de la tabla te_planillas_turnos_extras:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });
    
    // Obtener datos de muestra
    const { rows: sampleData } = await query(`
      SELECT * FROM te_planillas_turnos_extras LIMIT 3
    `);
    
    console.log('\n📊 Datos de muestra:');
    console.log(JSON.stringify(sampleData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarEstructuraPlanillas().then(() => {
  console.log('✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
