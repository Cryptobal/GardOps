import { query } from '../src/lib/database';

async function debugRolTestId() {
  try {
    console.log('🔍 Buscando rol con ID problemático...');
    
    // Buscar específicamente por "test-id"
    const result1 = await query(`
      SELECT id, nombre, estado, created_at 
      FROM as_turnos_roles_servicio 
      WHERE id = 'test-id'
    `);
    
    console.log(`📊 Resultados para 'test-id': ${result1.rows.length}`);
    if (result1.rows.length > 0) {
      console.log('Encontrado:', result1.rows[0]);
    }
    
    // Buscar IDs que contengan "test"
    const result2 = await query(`
      SELECT id, nombre, estado, created_at 
      FROM as_turnos_roles_servicio 
      WHERE id ILIKE '%test%'
    `);
    
    console.log(`📊 Resultados que contienen 'test': ${result2.rows.length}`);
    result2.rows.forEach(rol => {
      console.log(`  - ID: "${rol.id}" | Nombre: "${rol.nombre}" | Estado: ${rol.estado}`);
    });
    
    // Buscar IDs que no sean UUIDs válidos
    const result3 = await query(`
      SELECT id, nombre, estado, created_at 
      FROM as_turnos_roles_servicio 
      WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    `);
    
    console.log(`📊 Resultados con IDs no UUID: ${result3.rows.length}`);
    result3.rows.forEach(rol => {
      console.log(`  - ID: "${rol.id}" | Nombre: "${rol.nombre}" | Estado: ${rol.estado}`);
    });
    
    // Mostrar todos los IDs para verificar
    const result4 = await query(`
      SELECT id, nombre, estado 
      FROM as_turnos_roles_servicio 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 Todos los roles:');
    result4.rows.forEach(rol => {
      console.log(`  - ID: "${rol.id}" | Nombre: "${rol.nombre}" | Estado: ${rol.estado}`);
    });
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

// Ejecutar el debug
debugRolTestId()
  .then(() => {
    console.log('\n✅ Debug completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el debug:', error);
    process.exit(1);
  });
