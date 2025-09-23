#!/usr/bin/env node

const { sql } = require('@vercel/postgres');

async function diagnosticoRegistro() {
  console.log('🔍 DIAGNÓSTICO - REGISTRO DE LLAMADOS\n');

  try {
    // 1. Verificar llamados en la vista
    console.log('1️⃣ Verificando llamados en la vista...');
    const llamadosVista = await sql`
      SELECT 
        id,
        instalacion_nombre,
        programado_para,
        estado_llamado
      FROM central_v_llamados_automaticos
      WHERE estado_llamado = 'pendiente'
      LIMIT 3
    `;
    
    console.log('📋 Llamados en vista:');
    llamadosVista.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Instalación: ${row.instalacion_nombre}`);
      console.log(`    Estado: ${row.estado_llamado}`);
      console.log('');
    });

    if (llamadosVista.rows.length === 0) {
      console.log('❌ No hay llamados pendientes en la vista');
      return;
    }

    const llamadoPrueba = llamadosVista.rows[0];
    console.log(`🎯 Usando ID de prueba: ${llamadoPrueba.id}`);

    // 2. Verificar si el ID existe en central_llamados
    console.log('\n2️⃣ Verificando si el ID existe en central_llamados...');
    const llamadaReal = await sql`
      SELECT 
        id,
        estado,
        programado_para
      FROM central_llamados
      WHERE id = ${llamadoPrueba.id}
    `;
    
    if (llamadaReal.rows.length === 0) {
      console.log('❌ PROBLEMA IDENTIFICADO: El ID de la vista NO existe en central_llamados');
      console.log('🔧 Esto explica el error 404');
      
      // 3. Verificar estructura de la vista
      console.log('\n3️⃣ Verificando estructura de la vista...');
      const estructuraVista = await sql`
        SELECT 
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_name = 'central_v_llamados_automaticos'
        ORDER BY ordinal_position
      `;
      
      console.log('📊 Estructura de la vista:');
      estructuraVista.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
      
      // 4. Verificar si la vista está usando gen_random_uuid()
      console.log('\n4️⃣ Verificando definición de la vista...');
      const definicionVista = await sql`
        SELECT definition
        FROM pg_views
        WHERE viewname = 'central_v_llamados_automaticos'
      `;
      
      if (definicionVista.rows.length > 0) {
        const definicion = definicionVista.rows[0].definition;
        if (definicion.includes('gen_random_uuid()')) {
          console.log('❌ CONFIRMADO: La vista está usando gen_random_uuid()');
          console.log('🔧 Necesita aplicar la corrección db/corregir-vista-ids-reales.sql');
        } else {
          console.log('✅ La vista NO está usando gen_random_uuid()');
        }
      }
      
    } else {
      console.log('✅ El ID SÍ existe en central_llamados');
      console.log(`  - Estado: ${llamadaReal.rows[0].estado}`);
    }

    // 5. Verificar configuración de instalaciones
    console.log('\n5️⃣ Verificando configuración de instalaciones...');
    const configInstalaciones = await sql`
      SELECT 
        i.nombre,
        cci.habilitado,
        cci.intervalo_minutos
      FROM instalaciones i
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE cci.habilitado = true
      LIMIT 3
    `;
    
    console.log('🏢 Instalaciones con monitoreo habilitado:');
    configInstalaciones.rows.forEach(row => {
      console.log(`  - ${row.nombre}: ${row.intervalo_minutos} min`);
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  }
}

diagnosticoRegistro();


