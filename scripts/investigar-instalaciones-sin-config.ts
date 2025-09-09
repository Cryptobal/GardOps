#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function investigarInstalacionesSinConfig() {
  console.log('🔍 INVESTIGANDO INSTALACIONES SIN CONFIGURACIÓN\n');

  try {
    const fechaActual = new Date().toISOString().split('T')[0];
    const [anioActual, mesActual, diaActual] = fechaActual.split('-').map(Number);
    
    console.log(`📅 Verificando fecha: ${fechaActual}`);

    // 1. Obtener TODAS las instalaciones con turnos planificados
    console.log('1️⃣ Obtener todas las instalaciones con turnos planificados...');
    
    const todasInstalaciones = await query(`
      SELECT DISTINCT 
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        COUNT(pm.id) as turnos_planificados
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND pm.estado = 'planificado'
      GROUP BY pm.instalacion_id, i.nombre
      ORDER BY i.nombre
    `, [anioActual, mesActual, diaActual]);

    console.log(`📊 Todas las instalaciones con turnos planificados: ${todasInstalaciones.rows.length}`);
    todasInstalaciones.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.turnos_planificados} turnos`);
    });

    // 2. Obtener instalaciones CON configuración
    console.log('\n2️⃣ Obtener instalaciones CON configuración...');
    
    const instalacionesConConfig = await query(`
      SELECT DISTINCT 
        cci.instalacion_id,
        i.nombre as instalacion_nombre
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      ORDER BY i.nombre
    `);

    console.log(`📊 Instalaciones con configuración: ${instalacionesConConfig.rows.length}`);
    instalacionesConConfig.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}`);
    });

    // 3. Encontrar instalaciones SIN configuración
    console.log('\n3️⃣ Encontrar instalaciones SIN configuración...');
    
    const instalacionesConTurnos = todasInstalaciones.rows.map((row: any) => row.instalacion_id);
    const instalacionesConConfigIds = instalacionesConConfig.rows.map((row: any) => row.instalacion_id);
    
    const instalacionesSinConfig = todasInstalaciones.rows.filter(
      (row: any) => !instalacionesConConfigIds.includes(row.instalacion_id)
    );

    console.log(`📊 Instalaciones SIN configuración: ${instalacionesSinConfig.length}`);
    instalacionesSinConfig.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.turnos_planificados} turnos planificados`);
    });

    // 4. Verificar detalles de las instalaciones sin configuración
    if (instalacionesSinConfig.length > 0) {
      console.log('\n4️⃣ Detalles de instalaciones sin configuración...');
      
      for (const instalacion of instalacionesSinConfig) {
        const detalles = await query(`
          SELECT 
            pm.id as pauta_id,
            pm.estado,
            po.nombre_puesto,
            po.activo as puesto_activo,
            g.nombre as guardia_nombre
          FROM as_turnos_pauta_mensual pm
          INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
          LEFT JOIN guardias g ON pm.guardia_id = g.id
          WHERE pm.instalacion_id = $1
            AND pm.anio = $2 AND pm.mes = $3 AND pm.dia = $4
            AND pm.estado = 'planificado'
          ORDER BY po.nombre_puesto
        `, [instalacion.instalacion_id, anioActual, mesActual, diaActual]);

        console.log(`\n   📋 ${instalacion.instalacion_nombre}:`);
        detalles.rows.forEach((row: any) => {
          const guardia = row.guardia_nombre || 'Sin asignar';
          const puesto = row.puesto_activo ? 'ACTIVO' : 'INACTIVO';
          console.log(`      - ${row.nombre_puesto}: ${guardia} (${puesto})`);
        });
      }
    }

    // 5. Crear configuración para instalaciones que no la tienen
    if (instalacionesSinConfig.length > 0) {
      console.log('\n5️⃣ Creando configuración para instalaciones sin configuración...');
      
      let configuradas = 0;
      for (const instalacion of instalacionesSinConfig) {
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
      }

      console.log(`\n✅ Total configuradas: ${configuradas}`);
    }

    // 6. Verificar que ahora funcionen los llamados automáticos
    console.log('\n6️⃣ Verificando llamados automáticos después de la configuración...');
    
    const llamadosDespues = await query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = $1
    `, [fechaActual]);

    const stats = llamadosDespues.rows[0];
    console.log(`📊 Llamados automáticos después de la configuración: ${stats.total_llamados}`);
    console.log(`   - Actuales: ${stats.actuales}`);
    console.log(`   - Próximos: ${stats.proximos}`);
    console.log(`   - Urgentes: ${stats.urgentes}`);

    // 7. Mostrar llamados programados
    if (stats.total_llamados > 0) {
      console.log('\n7️⃣ Llamados programados:');
      
      const llamados = await query(`
        SELECT 
          instalacion_nombre,
          programado_para,
          estado_llamado,
          contacto_telefono
        FROM central_v_llamados_automaticos
        WHERE DATE(programado_para) = $1
        ORDER BY programado_para
      `, [fechaActual]);

      llamados.rows.forEach((row: any) => {
        console.log(`   - ${row.instalacion_nombre}: ${row.programado_para} (${row.estado_llamado}) - Tel: ${row.contacto_telefono || 'No disponible'}`);
      });
    }

    console.log('\n🎯 INVESTIGACIÓN COMPLETADA:');
    console.log('=============================');
    console.log(`✅ Instalaciones con turnos planificados: ${todasInstalaciones.rows.length}`);
    console.log(`✅ Instalaciones con configuración: ${instalacionesConConfig.rows.length}`);
    console.log(`✅ Instalaciones sin configuración: ${instalacionesSinConfig.length}`);
    console.log(`✅ Configuraciones creadas: ${instalacionesSinConfig.length > 0 ? instalacionesSinConfig.length : 0}`);
    console.log(`✅ Llamados automáticos generados: ${stats.total_llamados}`);

  } catch (error) {
    console.error('❌ Error durante la investigación:', error);
  } finally {
    process.exit(0);
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

investigarInstalacionesSinConfig();
