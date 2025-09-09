const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testDB() {
  console.log('🧪 PROBANDO BASE DE DATOS DIRECTAMENTE');
  console.log('=====================================\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const puestoId = '7898c7cc-7b2a-47e8-8834-0fe2a9091206';
    
    console.log('🔍 Verificando puesto:', puestoId);

    // 1. Verificar que el puesto existe
    const checkResult = await pool.query(
      'SELECT id, nombre_puesto FROM as_turnos_puestos_operativos WHERE id = $1',
      [puestoId]
    );

    console.log('📊 Resultado de verificación:');
    console.log('  - Encontrado:', checkResult.rows.length > 0);
    console.log('  - Puesto:', checkResult.rows[0] || 'No encontrado');

    if (checkResult.rows.length > 0) {
      // 2. Intentar eliminar el puesto
      console.log('\n🔍 Intentando eliminar el puesto...');
      
      const deleteResult = await pool.query(
        'DELETE FROM as_turnos_puestos_operativos WHERE id = $1 RETURNING id, nombre_puesto',
        [puestoId]
      );

      console.log('📊 Resultado de eliminación:');
      console.log('  - Eliminados:', deleteResult.rows.length);
      console.log('  - Puesto eliminado:', deleteResult.rows[0] || 'No eliminado');

      if (deleteResult.rows.length > 0) {
        console.log('✅ Puesto eliminado correctamente');
        
        // 3. Verificar que ya no existe
        const verifyResult = await pool.query(
          'SELECT id FROM as_turnos_puestos_operativos WHERE id = $1',
          [puestoId]
        );

        console.log('📊 Verificación post-eliminación:');
        console.log('  - Aún existe:', verifyResult.rows.length > 0);
        
        if (verifyResult.rows.length === 0) {
          console.log('✅ Confirmado: El puesto fue eliminado completamente');
        } else {
          console.log('❌ Error: El puesto aún existe');
        }
      } else {
        console.log('❌ Error: No se pudo eliminar el puesto');
      }
    } else {
      console.log('❌ Error: El puesto no existe');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testDB().then(() => {
  console.log('\n✅ Test completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
