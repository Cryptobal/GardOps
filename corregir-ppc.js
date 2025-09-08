const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function corregirProblemaPPC() {
  console.log('🔧 CORRIGIENDO PROBLEMA DE PPCs Y DATOS FANTASMA\n');
  
  try {
    await pool.query('BEGIN');
    
    // 1. Mostrar estado actual
    console.log('1️⃣ Estado actual del problema...');
    const estadoActual = await pool.query(`
      SELECT 
        pm.id,
        pm.puesto_id,
        pm.guardia_id,
        pm.estado,
        pm.estado_ui,
        po.nombre_puesto,
        i.nombre as instalacion_nombre,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = EXTRACT(YEAR FROM CURRENT_DATE)
        AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE)
        AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)
        AND i.nombre ILIKE '%Santa Amalia%'
      ORDER BY po.nombre_puesto
    `);
    
    console.log('📋 Estado actual:');
    estadoActual.rows.forEach(row => {
      console.log(`  - ${row.nombre_puesto}: Estado=${row.estado_ui}, Guardia=${row.guardia_nombre || 'Sin asignar'}`);
    });
    
    // 2. Corregir el estado del Puesto 2 en pauta mensual
    console.log('\n2️⃣ Corrigiendo estado del Puesto 2...');
    const updateResult = await pool.query(`
      UPDATE as_turnos_pauta_mensual 
      SET 
        estado = 'ppc',
        estado_ui = 'ppc',
        guardia_id = NULL,
        meta = meta - 'cobertura_guardia_id' - 'reemplazo_guardia_id',
        updated_at = NOW()
      WHERE puesto_id IN (
        SELECT po.id 
        FROM as_turnos_puestos_operativos po
        JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE i.nombre ILIKE '%Santa Amalia%'
          AND po.nombre_puesto = 'Puesto 2'
      )
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE)
      AND mes = EXTRACT(MONTH FROM CURRENT_DATE)
      AND dia = EXTRACT(DAY FROM CURRENT_DATE)
      RETURNING id, puesto_id, estado, estado_ui
    `);
    
    console.log(`✅ Registros actualizados: ${updateResult.rows.length}`);
    updateResult.rows.forEach(row => {
      console.log(`  - Puesto ${row.puesto_id}: ${row.estado_ui}`);
    });
    
    // 3. Asegurar que ambos puestos estén correctamente configurados como PPCs
    console.log('\n3️⃣ Verificando configuración de puestos operativos...');
    const puestosResult = await pool.query(`
      UPDATE as_turnos_puestos_operativos 
      SET 
        es_ppc = true,
        guardia_id = NULL,
        actualizado_en = NOW()
      WHERE id IN (
        SELECT po.id 
        FROM as_turnos_puestos_operativos po
        JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE i.nombre ILIKE '%Santa Amalia%'
          AND po.nombre_puesto IN ('Puesto #1', 'Puesto 2')
      )
      RETURNING id, nombre_puesto, es_ppc, guardia_id
    `);
    
    console.log(`✅ Puestos operativos actualizados: ${puestosResult.rows.length}`);
    puestosResult.rows.forEach(row => {
      console.log(`  - ${row.nombre_puesto}: PPC=${row.es_ppc}, Guardia=${row.guardia_id || 'NULL'}`);
    });
    
    // 4. Verificar el resultado final
    console.log('\n4️⃣ Verificando resultado final...');
    const resultadoFinal = await pool.query(`
      SELECT 
        pm.id,
        pm.puesto_id,
        pm.guardia_id,
        pm.estado,
        pm.estado_ui,
        po.nombre_puesto,
        i.nombre as instalacion_nombre,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = EXTRACT(YEAR FROM CURRENT_DATE)
        AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE)
        AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)
        AND i.nombre ILIKE '%Santa Amalia%'
      ORDER BY po.nombre_puesto
    `);
    
    console.log('📋 Estado final:');
    resultadoFinal.rows.forEach(row => {
      console.log(`  - ${row.nombre_puesto}: Estado=${row.estado_ui}, Guardia=${row.guardia_nombre || 'Sin asignar'}`);
    });
    
    // 5. Verificar la vista unificada
    console.log('\n5️⃣ Verificando vista unificada...');
    const vistaResult = await pool.query(`
      SELECT 
        pauta_id,
        puesto_id,
        instalacion_nombre,
        puesto_nombre,
        estado_ui,
        es_ppc,
        guardia_trabajo_nombre,
        guardia_titular_nombre
      FROM as_turnos_v_pauta_diaria_unificada
      WHERE fecha = CURRENT_DATE::text
        AND instalacion_nombre ILIKE '%Santa Amalia%'
      ORDER BY puesto_nombre
    `);
    
    console.log('📋 Vista unificada:');
    vistaResult.rows.forEach(row => {
      console.log(`  - ${row.puesto_nombre}: Estado=${row.estado_ui}, PPC=${row.es_ppc}, Trabajo=${row.guardia_trabajo_nombre || 'Sin asignar'}`);
    });
    
    await pool.query('COMMIT');
    console.log('\n✅ CORRECCIÓN COMPLETADA EXITOSAMENTE');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error en corrección:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

corregirProblemaPPC();
