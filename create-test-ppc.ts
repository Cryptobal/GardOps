#!/usr/bin/env ts-node

import { query } from './src/lib/database';

async function createTestPPC() {
  console.log('🔍 Creando PPC de prueba...');
  
  try {
    // 1. Buscar una instalación existente
    const instalacion = await query(`
      SELECT id, nombre FROM instalaciones LIMIT 1
    `);
    
    if (instalacion.rows.length === 0) {
      console.error('❌ No hay instalaciones disponibles');
      return;
    }
    
    const instalacionId = instalacion.rows[0].id;
    console.log('📍 Instalación:', instalacion.rows[0].nombre);
    
    // 2. Buscar un rol de servicio
    const rol = await query(`
      SELECT id, nombre FROM as_turnos_roles_servicio LIMIT 1
    `);
    
    if (rol.rows.length === 0) {
      console.error('❌ No hay roles de servicio disponibles');
      return;
    }
    
    const rolId = rol.rows[0].id;
    console.log('👔 Rol:', rol.rows[0].nombre);
    
    // 3. Crear puesto operativo PPC
    const puesto = await query(`
      INSERT INTO as_turnos_puestos_operativos 
      (instalacion_id, rol_id, nombre_puesto, es_ppc, activo, guardia_id)
      VALUES ($1, $2, 'PPC TEST - Modal Debug', true, true, NULL)
      RETURNING id, nombre_puesto
    `, [instalacionId, rolId]);
    
    const puestoId = puesto.rows[0].id;
    console.log('🏢 Puesto PPC creado:', puesto.rows[0].nombre_puesto);
    
    // 4. Crear entrada en pauta mensual para hoy
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    const dia = hoy.getDate();
    
    await query(`
      INSERT INTO as_turnos_pauta_mensual 
      (puesto_id, guardia_id, anio, mes, dia, estado, estado_ui)
      VALUES ($1, NULL, $2, $3, $4, 'planificado', 'plan')
      ON CONFLICT (puesto_id, anio, mes, dia) DO NOTHING
    `, [puestoId, anio, mes, dia]);
    
    console.log('✅ PPC de prueba creado exitosamente');
    console.log(`📅 Fecha: ${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`);
    console.log(`🆔 Puesto ID: ${puestoId}`);
    console.log('\n🎯 Ahora puedes:');
    console.log(`1. Ir a: https://ops.gard.cl/pauta-diaria?fecha=${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`);
    console.log('2. Buscar el puesto "PPC TEST - Modal Debug"');
    console.log('3. Hacer click en "👥 Cubrir"');
    console.log('4. Revisar los logs de debugging');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestPPC().catch(console.error);
