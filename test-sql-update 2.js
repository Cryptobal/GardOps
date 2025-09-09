require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function testSQLUpdate() {
  try {
    console.log('🔍 Probando consulta SQL de actualización...\n');

    // 1. Obtener un llamado existente
    console.log('1. Obteniendo llamado existente...');
    const llamado = await sql`
      SELECT id, estado, observaciones, ejecutado_en
      FROM central_llamados 
      WHERE estado = 'pendiente'
      LIMIT 1;
    `;
    
    if (llamado.rows.length === 0) {
      console.log('❌ No hay llamados pendientes');
      return;
    }
    
    const llamadoId = llamado.rows[0].id;
    console.log('   📞 Llamado encontrado:', llamadoId);
    console.log('   📊 Estado actual:', llamado.rows[0].estado);

    // 2. Probar la actualización
    console.log('\n2. Probando actualización...');
    const result = await sql`
      UPDATE central_llamados 
      SET 
        estado = 'exitoso',
        observaciones = 'Prueba SQL directa',
        ejecutado_en = NOW(),
        updated_at = NOW()
      WHERE id = ${llamadoId}
      RETURNING id, estado, observaciones, ejecutado_en;
    `;

    if (result.rows.length > 0) {
      console.log('   ✅ Actualización exitosa');
      console.log('   📊 Nuevo estado:', result.rows[0].estado);
      console.log('   📊 Observaciones:', result.rows[0].observaciones);
      console.log('   📊 Ejecutado en:', result.rows[0].ejecutado_en);
    } else {
      console.log('   ❌ No se pudo actualizar el llamado');
    }

    // 3. Verificar el cambio
    console.log('\n3. Verificando cambio...');
    const verificar = await sql`
      SELECT id, estado, observaciones, ejecutado_en
      FROM central_llamados 
      WHERE id = ${llamadoId};
    `;
    
    if (verificar.rows.length > 0) {
      console.log('   ✅ Verificación exitosa');
      console.log('   📊 Estado final:', verificar.rows[0].estado);
    } else {
      console.log('   ❌ No se encontró el llamado');
    }

    console.log('\n✅ Prueba SQL completada');

  } catch (error) {
    console.error('❌ Error SQL:', error);
  }
}

testSQLUpdate();
