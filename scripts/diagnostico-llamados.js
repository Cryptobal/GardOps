const { createClient } = require('@vercel/postgres');

async function diagnosticar() {
  const client = createClient({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    console.log('=== DIAGNÓSTICO DE LLAMADOS ===');
    
    // 1. Verificar llamados en la vista
    const vista = await client.query(`
      SELECT id, instalacion_nombre, estado_llamado 
      FROM central_v_llamados_automaticos 
      WHERE estado_llamado = 'pendiente' 
      LIMIT 3
    `);
    
    console.log('\n📋 Llamados en vista:');
    vista.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Instalación: ${row.instalacion_nombre}, Estado: ${row.estado_llamado}`);
    });
    
    // 2. Verificar si estos IDs existen en central_llamados
    if (vista.rows.length > 0) {
      const ids = vista.rows.map(row => `'${row.id}'`).join(',');
      const existentes = await client.query(`
        SELECT id FROM central_llamados WHERE id IN (${ids})
      `);
      
      console.log('\n✅ IDs que SÍ existen en central_llamados:');
      existentes.rows.forEach(row => console.log(`- ${row.id}`));
      
      console.log('\n❌ IDs que NO existen en central_llamados:');
      const idsExistentes = existentes.rows.map(row => row.id);
      vista.rows.forEach(row => {
        if (!idsExistentes.includes(row.id)) {
          console.log(`- ${row.id}`);
        }
      });
    }
    
    // 3. Verificar el ID específico del error
    const idError = '846b76fb-e02f-4c2e-8205-46936648c132';
    const existeError = await client.query(`
      SELECT id FROM central_llamados WHERE id = $1
    `, [idError]);
    
    console.log(`\n🔍 ID del error (${idError}): ${existeError.rows.length > 0 ? 'EXISTE' : 'NO EXISTE'}`);
    
    // 4. Verificar si hay datos en central_llamados
    const totalLlamados = await client.query('SELECT COUNT(*) as total FROM central_llamados');
    console.log(`\n📊 Total de registros en central_llamados: ${totalLlamados.rows[0].total}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

diagnosticar();

