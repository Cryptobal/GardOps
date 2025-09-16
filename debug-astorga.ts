#!/usr/bin/env ts-node

import pool from '../src/lib/database';

async function debugAstorga() {
  console.log('🔍 DEBUGGING ASTORGA NAME ISSUE\n');

  try {
    // 1. Verificar datos del guardia Astorga
    console.log('1️⃣ Verificando datos del guardia Astorga...');
    const guardiaResult = await pool.query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as nombre_malformado,
        CONCAT(g.nombre, ' ', g.apellido_paterno) as nombre_correcto
      FROM guardias g 
      WHERE g.nombre ILIKE '%astorga%' OR g.apellido_paterno ILIKE '%astorga%'
    `);
    
    console.log('📊 Datos del guardia:');
    guardiaResult.rows.forEach((row: any) => {
      console.log(`   ID: ${row.id}`);
      console.log(`   Nombre: "${row.nombre}"`);
      console.log(`   Apellido Paterno: "${row.apellido_paterno}"`);
      console.log(`   Apellido Materno: "${row.apellido_materno}"`);
      console.log(`   Nombre malformado: "${row.nombre_malformado}"`);
      console.log(`   Nombre correcto: "${row.nombre_correcto}"`);
      console.log('');
    });

    // 2. Verificar la pauta mensual de hoy
    console.log('2️⃣ Verificando pauta mensual de hoy...');
    const pautaResult = await pool.query(`
      SELECT 
        pm.id,
        pm.puesto_id,
        pm.guardia_id,
        pm.estado,
        pm.estado_ui,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as nombre_malformado
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = 2024 AND pm.mes = 9 AND pm.dia = 12
        AND (g.nombre ILIKE '%astorga%' OR g.apellido_paterno ILIKE '%astorga%')
    `);
    
    console.log('📊 Pauta mensual:');
    pautaResult.rows.forEach((row: any) => {
      console.log(`   Pauta ID: ${row.id}`);
      console.log(`   Puesto ID: ${row.puesto_id}`);
      console.log(`   Guardia ID: ${row.guardia_id}`);
      console.log(`   Estado: ${row.estado}`);
      console.log(`   Estado UI: ${row.estado_ui}`);
      console.log(`   Nombre: "${row.nombre}"`);
      console.log(`   Apellido Paterno: "${row.apellido_paterno}"`);
      console.log(`   Apellido Materno: "${row.apellido_materno}"`);
      console.log(`   Nombre malformado: "${row.nombre_malformado}"`);
      console.log('');
    });

    // 3. Verificar la vista unificada
    console.log('3️⃣ Verificando vista unificada...');
    const vistaResult = await pool.query(`
      SELECT 
        pauta_id,
        puesto_nombre,
        guardia_titular_nombre,
        guardia_trabajo_nombre,
        estado_ui,
        es_ppc
      FROM as_turnos_v_pauta_diaria_unificada 
      WHERE fecha = '2024-09-12'
        AND (guardia_titular_nombre ILIKE '%astorga%' OR guardia_trabajo_nombre ILIKE '%astorga%')
    `);
    
    console.log('📊 Vista unificada:');
    vistaResult.rows.forEach((row: any) => {
      console.log(`   Pauta ID: ${row.pauta_id}`);
      console.log(`   Puesto: ${row.puesto_nombre}`);
      console.log(`   Guardia titular: "${row.guardia_titular_nombre}"`);
      console.log(`   Guardia trabajo: "${row.guardia_trabajo_nombre}"`);
      console.log(`   Estado UI: ${row.estado_ui}`);
      console.log(`   Es PPC: ${row.es_ppc}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  debugAstorga().then(() => process.exit(0));
}

export { debugAstorga };
