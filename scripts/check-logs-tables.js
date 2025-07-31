// Script para verificar las tablas de logs
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkLogsTables() {
  console.log('🔍 Verificando tablas de logs...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Verificar conexión
    console.log('1. Verificando conexión...');
    const connectionTest = await pool.query('SELECT 1 as test');
    console.log('✅ Conexión exitosa\n');

    // Verificar tablas de logs
    console.log('2. Verificando tablas de logs...');
    const logTables = ['logs_clientes', 'logs_instalaciones', 'logs_guardias'];
    
    for (const table of logTables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      console.log(`${table}: ${exists.rows[0].exists ? '✅ Existe' : '❌ No existe'}`);
      
      if (exists.rows[0].exists) {
        // Verificar estructura de la tabla
        const columns = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [table]);
        
        console.log(`  Columnas: ${columns.rows.map(col => `${col.column_name} (${col.data_type})`).join(', ')}`);
        
        // Verificar cantidad de registros
        const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  Registros: ${count.rows[0].count}`);
        
        // Mostrar algunos ejemplos
        if (parseInt(count.rows[0].count) > 0) {
          const examples = await pool.query(`SELECT * FROM ${table} ORDER BY fecha DESC LIMIT 3`);
          console.log(`  Ejemplos:`);
          examples.rows.forEach((row, index) => {
            console.log(`    ${index + 1}. ${JSON.stringify(row)}`);
          });
        }
      }
      console.log('');
    }

    // Verificar instalación específica
    console.log('3. Verificando instalación específica...');
    const instalacionId = 'fb0d4f19-75f3-457e-8181-df032266441c';
    
    const instalacion = await pool.query('SELECT * FROM instalaciones WHERE id = $1', [instalacionId]);
    console.log(`Instalación encontrada: ${instalacion.rows.length > 0 ? '✅' : '❌'}`);
    
    if (instalacion.rows.length > 0) {
      console.log('Datos de la instalación:', instalacion.rows[0]);
    }

    // Verificar logs de instalaciones
    console.log('\n4. Verificando logs de instalaciones...');
    const logsInstalaciones = await pool.query(`
      SELECT * FROM logs_instalaciones 
      WHERE instalacion_id = $1 
      ORDER BY fecha DESC 
      LIMIT 5
    `, [instalacionId]);
    
    console.log(`Logs encontrados: ${logsInstalaciones.rows.length}`);
    logsInstalaciones.rows.forEach((log, index) => {
      console.log(`  ${index + 1}. ${JSON.stringify(log)}`);
    });

    // Verificar logs de clientes (fallback)
    console.log('\n5. Verificando logs de clientes (fallback)...');
    const logsClientes = await pool.query(`
      SELECT * FROM logs_clientes 
      WHERE cliente_id = $1 
      ORDER BY fecha DESC 
      LIMIT 5
    `, [instalacionId]);
    
    console.log(`Logs en clientes encontrados: ${logsClientes.rows.length}`);
    logsClientes.rows.forEach((log, index) => {
      console.log(`  ${index + 1}. ${JSON.stringify(log)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkLogsTables(); 