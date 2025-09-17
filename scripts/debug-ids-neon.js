#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugIds() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 INVESTIGANDO IDs EN NEON...\n');
    
    // 1. Verificar IDs en la vista para hoy
    console.log('1. IDs en la VISTA para hoy:');
    const vistaResult = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora,
        estado_llamado
      FROM central_v_llamados_automaticos 
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
      ORDER BY programado_para ASC
      LIMIT 5
    `);
    
    console.log('Vista tiene', vistaResult.rows.length, 'llamados:');
    vistaResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id} | ${row.instalacion_nombre} | ${row.hora}:00 | ${row.estado_llamado}`);
    });
    
    // 2. Verificar IDs en la tabla central_llamados para hoy
    console.log('\n2. IDs en la TABLA central_llamados para hoy:');
    const tablaResult = await client.query(`
      SELECT 
        id,
        instalacion_id,
        DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora,
        estado
      FROM central_llamados 
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
      ORDER BY programado_para ASC
      LIMIT 5
    `);
    
    console.log('Tabla tiene', tablaResult.rows.length, 'llamados:');
    tablaResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id} | Instalación: ${row.instalacion_id} | ${row.hora}:00 | ${row.estado}`);
    });
    
    // 3. Verificar el ID específico que está fallando
    console.log('\n3. Verificando ID específico del frontend:');
    const idEspecifico = '6a45acce-309d-4cfe-b2a4-02d34c97042c';
    
    const vistaCheck = await client.query(`
      SELECT COUNT(*) as count FROM central_v_llamados_automaticos WHERE id = $1
    `, [idEspecifico]);
    
    const tablaCheck = await client.query(`
      SELECT COUNT(*) as count FROM central_llamados WHERE id = $1
    `, [idEspecifico]);
    
    console.log(`ID ${idEspecifico}:`);
    console.log(`  - En vista: ${vistaCheck.rows[0].count > 0 ? 'EXISTE' : 'NO EXISTE'}`);
    console.log(`  - En tabla: ${tablaCheck.rows[0].count > 0 ? 'EXISTE' : 'NO EXISTE'}`);
    
    // 4. Verificar si la vista está regenerando IDs
    console.log('\n4. Verificando si la vista regenera IDs...');
    const vistaResult2 = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora
      FROM central_v_llamados_automaticos 
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
      ORDER BY programado_para ASC
      LIMIT 3
    `);
    
    console.log('Segunda consulta a la vista:');
    vistaResult2.rows.forEach(row => {
      console.log(`  - ID: ${row.id} | ${row.instalacion_nombre} | ${row.hora}:00`);
    });
    
    // Comparar IDs
    const idsIguales = vistaResult.rows.every((row, index) => 
      vistaResult2.rows[index] && row.id === vistaResult2.rows[index].id
    );
    
    console.log(`\n¿Los IDs son consistentes? ${idsIguales ? 'SÍ' : 'NO'}`);
    
    if (!idsIguales) {
      console.log('🚨 PROBLEMA CONFIRMADO: La vista está regenerando IDs aleatorios');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugIds();
