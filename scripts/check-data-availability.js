const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkDataAvailability() {
  console.log('🔍 VERIFICANDO DISPONIBILIDAD DE DATOS\n');

  const client = await pool.connect();
  
  try {
    // 1. Verificar datos en pauta mensual
    console.log('1️⃣ Verificando pauta mensual...');
    const pautaData = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN tipo_turno = 'planificado' THEN 1 END) as planificados,
        MIN(anio || '-' || LPAD(mes::text,2,'0') || '-' || LPAD(dia::text,2,'0')) as fecha_min,
        MAX(anio || '-' || LPAD(mes::text,2,'0') || '-' || LPAD(dia::text,2,'0')) as fecha_max
      FROM as_turnos_pauta_mensual
    `);
    
    console.log('📊 Pauta mensual:', pautaData.rows[0]);

    // 2. Verificar instalaciones activas
    console.log('2️⃣ Verificando instalaciones...');
    const instalacionesData = await client.query(`
      SELECT 
        COUNT(*) as total_instalaciones,
        COUNT(CASE WHEN cci.habilitado = true THEN 1 END) as habilitadas,
        COUNT(CASE WHEN cci.intervalo_minutos IS NOT NULL THEN 1 END) as con_intervalo,
        COUNT(CASE WHEN cci.ventana_inicio IS NOT NULL THEN 1 END) as con_ventana_inicio,
        COUNT(CASE WHEN cci.ventana_fin IS NOT NULL THEN 1 END) as con_ventana_fin
      FROM instalaciones i
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
    `);
    
    console.log('📊 Instalaciones:', instalacionesData.rows[0]);

    // 3. Verificar puestos activos
    console.log('3️⃣ Verificando puestos operativos...');
    const puestosData = await client.query(`
      SELECT 
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN activo = true THEN 1 END) as activos
      FROM as_turnos_puestos_operativos
    `);
    
    console.log('📊 Puestos operativos:', puestosData.rows[0]);

    // 4. Verificar configuración de ventanas
    console.log('4️⃣ Verificando configuración de ventanas...');
    const ventanasData = await client.query(`
      SELECT 
        ventana_inicio,
        ventana_fin,
        ventana_inicio < ventana_fin as ventana_valida,
        intervalo_minutos,
        COUNT(*) as cantidad
      FROM central_config_instalacion
      WHERE habilitado = true
      GROUP BY ventana_inicio, ventana_fin, intervalo_minutos
      ORDER BY cantidad DESC
    `);
    
    console.log('📊 Configuración de ventanas:');
    ventanasData.rows.forEach(row => {
      console.log(`  - ${row.ventana_inicio} a ${row.ventana_fin} (${row.intervalo_minutos}min) - Válida: ${row.ventana_valida} - Cantidad: ${row.cantidad}`);
    });

    // 5. Probar consulta simplificada
    console.log('5️⃣ Probando consulta simplificada...');
    const testQuery = await client.query(`
      SELECT 
        pm.id,
        i.nombre as instalacion,
        pm.anio, pm.mes, pm.dia,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.intervalo_minutos,
        cci.ventana_inicio < cci.ventana_fin as ventana_valida
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
      INNER JOIN instalaciones i ON i.id = po.instalacion_id
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE pm.tipo_turno = 'planificado'
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
      LIMIT 5
    `);
    
    console.log('📊 Muestra de datos válidos:');
    testQuery.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.instalacion} - ${row.anio}-${row.mes}-${row.dia} - ${row.ventana_inicio} a ${row.ventana_fin} (${row.intervalo_minutos}min) - Válida: ${row.ventana_valida}`);
    });

    console.log('\n🎯 DIAGNÓSTICO COMPLETADO');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
checkDataAvailability()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

