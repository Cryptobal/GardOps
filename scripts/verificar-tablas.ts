import { query } from '../src/lib/database';

async function verificarTablas() {
  console.log('🔍 Verificando todas las tablas disponibles...\n');

  try {
    // Obtener todas las tablas
    const tablasResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%rol%' OR table_name LIKE '%servicio%' OR table_name LIKE '%turno%'
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas encontradas:');
    tablasResult.rows.forEach(tabla => {
      console.log(`   - ${tabla.table_name}`);
    });

    // Verificar si existe alguna tabla con roles
    const rolesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%rol%'
      ORDER BY table_name
    `);
    
    console.log('\n🎭 Tablas con "rol" en el nombre:');
    rolesResult.rows.forEach(tabla => {
      console.log(`   - ${tabla.table_name}`);
    });

    // Verificar si existe alguna tabla con servicio
    const servicioResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%servicio%'
      ORDER BY table_name
    `);
    
    console.log('\n🔧 Tablas con "servicio" en el nombre:');
    servicioResult.rows.forEach(tabla => {
      console.log(`   - ${tabla.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
  }
}

// Ejecutar la verificación
verificarTablas()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 