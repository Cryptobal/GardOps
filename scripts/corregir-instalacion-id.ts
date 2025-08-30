#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function corregirInstalacionId() {
  console.log('🔧 CORRIGIENDO INSTALACION_ID NULL\n');

  try {
    // 1. Verificar turnos con instalacion_id null
    console.log('1️⃣ Verificando turnos con instalacion_id null...');
    
    const turnosConNull = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.puesto_id,
        pm.estado,
        po.instalacion_id as puesto_instalacion_id,
        po.nombre_puesto,
        i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
        AND pm.instalacion_id IS NULL
      ORDER BY i.nombre, po.nombre_puesto
    `);

    console.log(`📊 Turnos con instalacion_id null: ${turnosConNull.rows.length}`);
    turnosConNull.rows.forEach((row: any) => {
      console.log(`   - Pauta ID: ${row.pauta_id}, Puesto: ${row.nombre_puesto}, Instalación: ${row.instalacion_nombre} (ID: ${row.puesto_instalacion_id})`);
    });

    // 2. Corregir instalacion_id
    console.log('\n2️⃣ Corrigiendo instalacion_id...');
    
    const resultado = await query(`
      UPDATE as_turnos_pauta_mensual pm
      SET instalacion_id = po.instalacion_id,
          updated_at = NOW()
      FROM as_turnos_puestos_operativos po
      WHERE pm.puesto_id = po.id
        AND pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
        AND pm.instalacion_id IS NULL
    `);

    console.log(`✅ Filas actualizadas: ${resultado.rowCount}`);

    // 3. Verificar que se corrigieron
    console.log('\n3️⃣ Verificando que se corrigieron...');
    
    const turnosCorregidos = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.estado,
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        po.nombre_puesto
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
        AND pm.estado = 'planificado'
      ORDER BY i.nombre, po.nombre_puesto
    `);

    console.log(`📊 Turnos planificados corregidos: ${turnosCorregidos.rows.length}`);
    turnosCorregidos.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.nombre_puesto} (${row.estado}) - Instalación ID: ${row.instalacion_id}`);
    });

    // 4. Verificar instalaciones únicas
    console.log('\n4️⃣ Verificando instalaciones únicas...');
    
    const instalacionesUnicas = await query(`
      SELECT DISTINCT 
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        COUNT(pm.id) as turnos_planificados
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30
        AND pm.estado = 'planificado'
      GROUP BY pm.instalacion_id, i.nombre
      ORDER BY i.nombre
    `);

    console.log(`📊 Instalaciones con turnos planificados: ${instalacionesUnicas.rows.length}`);
    instalacionesUnicas.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.turnos_planificados} turnos`);
    });

    // 5. Verificar llamados automáticos
    console.log('\n5️⃣ Verificando llamados automáticos...');
    
    const llamadosAutomaticos = await query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = '2025-08-30'
    `);

    const stats = llamadosAutomaticos.rows[0];
    console.log(`📊 Llamados automáticos para el 30 de agosto: ${stats.total_llamados}`);
    console.log(`   - Actuales: ${stats.actuales}`);
    console.log(`   - Próximos: ${stats.proximos}`);
    console.log(`   - Urgentes: ${stats.urgentes}`);

    // 6. Mostrar llamados programados si existen
    if (stats.total_llamados > 0) {
      console.log('\n6️⃣ Llamados programados:');
      
      const llamados = await query(`
        SELECT 
          instalacion_nombre,
          programado_para,
          estado_llamado,
          contacto_telefono
        FROM central_v_llamados_automaticos
        WHERE DATE(programado_para) = '2025-08-30'
        ORDER BY programado_para
      `);

      llamados.rows.forEach((row: any) => {
        console.log(`   - ${row.instalacion_nombre}: ${row.programado_para} (${row.estado_llamado}) - Tel: ${row.contacto_telefono || 'No disponible'}`);
      });
    }

    console.log('\n🎯 CORRECCIÓN COMPLETADA:');
    console.log('=============================');
    console.log(`✅ Turnos corregidos: ${resultado.rowCount}`);
    console.log(`✅ Turnos planificados: ${turnosCorregidos.rows.length}`);
    console.log(`✅ Instalaciones únicas: ${instalacionesUnicas.rows.length}`);
    console.log(`✅ Llamados automáticos: ${stats.total_llamados}`);
    console.log('✅ Central de Monitoreo ahora debería funcionar correctamente');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

corregirInstalacionId();
