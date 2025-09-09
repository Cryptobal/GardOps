import { query } from '../src/lib/database';

async function verificarTablasPlanillas() {
  try {
    console.log('🔍 Buscando tablas relacionadas con planillas...');
    
    // Buscar todas las tablas que contengan "planilla" en el nombre
    const { rows: tables } = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%planilla%'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tablas encontradas:');
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
    
    // También buscar tablas que contengan "turno" y "extra"
    const { rows: turnosTables } = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%turno%' AND table_name ILIKE '%extra%'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tablas de turnos extras:');
    turnosTables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Buscar tablas que empiecen con TE_
    const { rows: teTables } = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'TE_%'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tablas con prefijo TE_:');
    teTables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarTablasPlanillas().then(() => {
  console.log('✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
