// Script para crear tabla logs_instalaciones
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function createLogsInstalaciones() {
  console.log('🔍 Creando tabla logs_instalaciones...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // 1. Crear la tabla
    console.log('1. Creando tabla logs_instalaciones...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs_instalaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instalacion_id UUID NOT NULL,
        accion TEXT NOT NULL,
        usuario TEXT NOT NULL DEFAULT 'Admin',
        tipo TEXT NOT NULL DEFAULT 'manual',
        contexto TEXT,
        fecha TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        
        CONSTRAINT fk_logs_instalaciones_instalacion 
          FOREIGN KEY (instalacion_id) 
          REFERENCES instalaciones(id) 
          ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla logs_instalaciones creada');

    // 2. Crear índices
    console.log('\n2. Creando índices...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_logs_instalaciones_instalacion_id ON logs_instalaciones(instalacion_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_logs_instalaciones_fecha ON logs_instalaciones(fecha DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_logs_instalaciones_tipo ON logs_instalaciones(tipo)');
    console.log('✅ Índices creados');

    // 3. Insertar datos de ejemplo
    console.log('\n3. Insertando datos de ejemplo...');
    const instalacionId = 'fb0d4f19-75f3-457e-8181-df032266441c';
    
    await pool.query(`
      INSERT INTO logs_instalaciones (instalacion_id, accion, usuario, tipo, contexto, fecha) VALUES
      ($1, 'Instalación creada', 'Admin', 'sistema', 'Creación inicial de la instalación', NOW() - INTERVAL '2 days'),
      ($1, 'Datos actualizados', 'Admin', 'manual', 'Actualización de información básica', NOW() - INTERVAL '1 day'),
      ($1, 'Ubicación modificada', 'Admin', 'manual', 'Cambio de coordenadas GPS', NOW() - INTERVAL '12 hours'),
      ($1, 'Estado cambiado a Activo', 'Admin', 'manual', 'Activación de la instalación', NOW() - INTERVAL '6 hours')
    `, [instalacionId]);
    console.log('✅ Datos de ejemplo insertados');

    // 4. Verificar
    console.log('\n4. Verificando...');
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_registros,
        MIN(fecha) as fecha_mas_antigua,
        MAX(fecha) as fecha_mas_reciente
      FROM logs_instalaciones
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    console.log('Resultado:', result.rows[0]);

    // 5. Mostrar logs
    console.log('\n5. Logs creados:');
    const logs = await pool.query(`
      SELECT accion, usuario, tipo, contexto, fecha
      FROM logs_instalaciones
      WHERE instalacion_id = $1
      ORDER BY fecha DESC
    `, [instalacionId]);
    
    logs.rows.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.accion} - ${log.usuario} (${log.tipo}) - ${log.fecha}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

createLogsInstalaciones(); 