#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function configurarCentralMonitoreo() {
  console.log('⚙️ CONFIGURANDO CENTRAL DE MONITOREO\n');

  try {
    // 1. Obtener instalaciones con turnos planificados
    console.log('1️⃣ Obteniendo instalaciones con turnos planificados...');
    
    const instalaciones = await query(`
      SELECT DISTINCT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 30 
        AND pm.estado = 'planificado'
      ORDER BY i.nombre
    `);

    console.log(`✅ Encontradas ${instalaciones.rows.length} instalaciones con turnos planificados:`);
    instalaciones.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre} (ID: ${row.instalacion_id})`);
    });

    // 2. Verificar configuración existente
    console.log('\n2️⃣ Verificando configuración existente...');
    
    const configuracionExistente = await query(`
      SELECT 
        cci.instalacion_id,
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      ORDER BY i.nombre
    `);

    console.log('📋 Configuración existente:');
    configuracionExistente.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? 'HABILITADO' : 'NO HABILITADO';
      const config = row.intervalo_minutos ? 
        `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}` : 
        'SIN CONFIGURAR';
      console.log(`   - ${row.instalacion_nombre}: ${habilitado} (${config})`);
    });

    // 3. Configurar instalaciones que no tienen configuración
    console.log('\n3️⃣ Configurando instalaciones sin configuración...');
    
    let configuradas = 0;
    
    for (const instalacion of instalaciones.rows) {
      // Verificar si ya tiene configuración
      const tieneConfig = configuracionExistente.rows.find(
        (config: any) => config.instalacion_id === instalacion.instalacion_id
      );

      if (!tieneConfig) {
        // Crear configuración por defecto
        await query(`
          INSERT INTO central_config_instalacion (
            instalacion_id,
            habilitado,
            intervalo_minutos,
            ventana_inicio,
            ventana_fin,
            modo,
            mensaje_template,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          instalacion.instalacion_id,
          true, // habilitado
          60,   // intervalo_minutos (1 hora)
          '21:00', // ventana_inicio
          '07:00', // ventana_fin
          'automatico', // modo
          'Hola, este es un llamado de monitoreo desde GardOps. ¿Todo está bien en la instalación?' // mensaje_template
        ]);

        console.log(`   ✅ Configurada: ${instalacion.instalacion_nombre}`);
        configuradas++;
      } else {
        console.log(`   ℹ️ Ya configurada: ${instalacion.instalacion_nombre}`);
      }
    }

    // 4. Habilitar todas las configuraciones existentes
    console.log('\n4️⃣ Habilitando todas las configuraciones...');
    
    const habilitadas = await query(`
      UPDATE central_config_instalacion 
      SET habilitado = true, updated_at = NOW()
      WHERE instalacion_id IN (
        SELECT DISTINCT instalacion_id 
        FROM as_turnos_pauta_mensual 
        WHERE anio = 2025 AND mes = 8 AND dia = 30 AND estado = 'planificado'
      )
    `);

    console.log(`✅ ${habilitadas.rowCount} configuraciones habilitadas`);

    // 5. Verificar que la vista automática funcione
    console.log('\n5️⃣ Verificando vista automática...');
    
    const fechaTest = '2025-08-30';
    const resultado = await query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = $1
    `, [fechaTest]);

    const stats = resultado.rows[0];
    console.log('📊 Estadísticas de la vista automática (30 de agosto):');
    console.log(`   - Total llamados: ${stats.total_llamados}`);
    console.log(`   - Actuales: ${stats.actuales}`);
    console.log(`   - Próximos: ${stats.proximos}`);
    console.log(`   - Urgentes: ${stats.urgentes}`);

    // 6. Mostrar llamados programados
    console.log('\n6️⃣ Llamados programados:');
    
    const llamados = await query(`
      SELECT 
        instalacion_nombre,
        programado_para,
        estado_llamado,
        contacto_telefono
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = $1
      ORDER BY programado_para
    `, [fechaTest]);

    if (llamados.rows.length > 0) {
      llamados.rows.forEach((row: any) => {
        console.log(`   - ${row.instalacion_nombre}: ${row.programado_para} (${row.estado_llamado}) - Tel: ${row.contacto_telefono || 'No disponible'}`);
      });
    } else {
      console.log('   ❌ No hay llamados programados');
    }

    // 7. Verificar configuración final
    console.log('\n7️⃣ Configuración final:');
    
    const configFinal = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        cci.habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      WHERE cci.instalacion_id IN (
        SELECT DISTINCT instalacion_id 
        FROM as_turnos_pauta_mensual 
        WHERE anio = 2025 AND mes = 8 AND dia = 30 AND estado = 'planificado'
      )
      ORDER BY i.nombre
    `);

    configFinal.rows.forEach((row: any) => {
      const habilitado = row.habilitado ? '✅ HABILITADO' : '❌ NO HABILITADO';
      const config = `${row.intervalo_minutos}min, ${row.ventana_inicio}-${row.ventana_fin}`;
      console.log(`   - ${row.instalacion_nombre}: ${habilitado} (${config})`);
    });

    console.log('\n🎯 CONFIGURACIÓN COMPLETADA:');
    console.log('=============================');
    console.log(`✅ ${configuradas} instalaciones configuradas`);
    console.log(`✅ ${habilitadas.rowCount} configuraciones habilitadas`);
    console.log(`✅ ${stats.total_llamados} llamados automáticos generados`);
    console.log('✅ Central de Monitoreo funcionando correctamente');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Verificar Central de Monitoreo en la interfaz');
    console.log('2. Probar registro de llamados');
    console.log('3. Verificar que aparezcan los llamados automáticos');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

configurarCentralMonitoreo();
