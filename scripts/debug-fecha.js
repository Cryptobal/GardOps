#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugFecha() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DEBUGGEANDO FECHA...\n');
    
    const result = await client.query(`
      SELECT 
        id,
        programado_para,
        instalacion_nombre
      FROM central_v_llamados_automaticos 
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
      ORDER BY programado_para ASC
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('Datos originales:');
      console.log(`  ID: ${row.id}`);
      console.log(`  programado_para: ${row.programado_para} (tipo: ${typeof row.programado_para})`);
      console.log(`  instalacion_nombre: ${row.instalacion_nombre}`);
      
      console.log('\nProbando conversiones de fecha:');
      
      // Probar diferentes formatos
      const fecha1 = new Date(row.programado_para);
      console.log(`  new Date(programado_para): ${fecha1} (válida: ${!isNaN(fecha1.getTime())})`);
      
      const fecha2 = new Date(row.programado_para + 'Z');
      console.log(`  new Date(programado_para + 'Z'): ${fecha2} (válida: ${!isNaN(fecha2.getTime())})`);
      
      const fecha3 = new Date(row.programado_para + 'T00:00:00Z');
      console.log(`  new Date(programado_para + 'T00:00:00Z'): ${fecha3} (válida: ${!isNaN(fecha3.getTime())})`);
      
      // Usar directamente la fecha de la base de datos
      console.log('\nUsando fecha directamente de la base de datos:');
      const fechaDirecta = row.programado_para;
      console.log(`  Fecha directa: ${fechaDirecta}`);
      
    } else {
      console.log('❌ No se encontraron datos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugFecha();

