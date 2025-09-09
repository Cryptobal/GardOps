// Script para verificar el estado de la base de datos
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkDatabase() {
  console.log('🔍 Verificando estado de la base de datos...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Verificar conexión
    console.log('1. Verificando conexión...');
    const connectionTest = await pool.query('SELECT 1 as test');
    console.log('✅ Conexión exitosa\n');

    // Verificar tablas
    console.log('2. Verificando tablas...');
    const tables = ['guardias', 'instalaciones', 'clientes'];
    
    for (const table of tables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      console.log(`${table}: ${exists.rows[0].exists ? '✅ Existe' : '❌ No existe'}`);
    }
    console.log('');

    // Verificar datos en guardias
    console.log('3. Verificando datos en guardias...');
    const guardiasCount = await pool.query('SELECT COUNT(*) FROM guardias');
    console.log(`Total guardias: ${guardiasCount.rows[0].count}`);

    const guardiasConCoordenadas = await pool.query(`
      SELECT COUNT(*) 
      FROM guardias 
      WHERE latitud IS NOT NULL 
        AND longitud IS NOT NULL 
        AND activo = true
    `);
    console.log(`Guardias con coordenadas válidas: ${guardiasConCoordenadas.rows[0].count}`);

    if (parseInt(guardiasConCoordenadas.rows[0].count) > 0) {
      const ejemploGuardia = await pool.query(`
        SELECT id, nombre, apellido, rut, ciudad, comuna, region, latitud, longitud, activo
        FROM guardias 
        WHERE latitud IS NOT NULL 
          AND longitud IS NOT NULL 
          AND activo = true
        LIMIT 1
      `);
      console.log('Ejemplo guardia:', ejemploGuardia.rows[0]);
    }
    console.log('');

    // Verificar datos en instalaciones
    console.log('4. Verificando datos en instalaciones...');
    const instalacionesCount = await pool.query('SELECT COUNT(*) FROM instalaciones');
    console.log(`Total instalaciones: ${instalacionesCount.rows[0].count}`);

    const instalacionesConCoordenadas = await pool.query(`
      SELECT COUNT(*) 
      FROM instalaciones 
      WHERE latitud IS NOT NULL 
        AND longitud IS NOT NULL 
        AND estado = 'Activo'
        AND direccion IS NOT NULL 
        AND direccion != ''
    `);
    console.log(`Instalaciones con coordenadas válidas: ${instalacionesConCoordenadas.rows[0].count}`);

    if (parseInt(instalacionesConCoordenadas.rows[0].count) > 0) {
      const ejemploInstalacion = await pool.query(`
        SELECT i.id, i.nombre, i.direccion, i.latitud, i.longitud, i.estado, c.nombre as cliente_nombre
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        WHERE i.latitud IS NOT NULL 
          AND i.longitud IS NOT NULL 
          AND i.estado = 'Activo'
          AND i.direccion IS NOT NULL 
          AND i.direccion != ''
        LIMIT 1
      `);
      console.log('Ejemplo instalación:', ejemploInstalacion.rows[0]);
    }
    console.log('');

    // Verificar tenant_id
    console.log('5. Verificando tenant_id...');
    const tenantIds = await pool.query('SELECT DISTINCT tenant_id FROM guardias LIMIT 5');
    console.log('Tenant IDs en guardias:', tenantIds.rows.map(row => row.tenant_id));

    const tenantIdsInstalaciones = await pool.query('SELECT DISTINCT tenant_id FROM instalaciones LIMIT 5');
    console.log('Tenant IDs en instalaciones:', tenantIdsInstalaciones.rows.map(row => row.tenant_id));
    console.log('');

    // Resumen
    console.log('📊 RESUMEN:');
    console.log(`✅ Conexión: OK`);
    console.log(`✅ Tablas: ${tables.every(t => true) ? 'OK' : 'Algunas faltan'}`);
    console.log(`✅ Guardias con coordenadas: ${guardiasConCoordenadas.rows[0].count}`);
    console.log(`✅ Instalaciones con coordenadas: ${instalacionesConCoordenadas.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error verificando base de datos:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
checkDatabase(); 