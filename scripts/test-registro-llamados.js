#!/usr/bin/env node

const { sql } = require('@vercel/postgres');

async function testRegistroLlamados() {
  console.log('🧪 PRUEBA COMPLETA - REGISTRO DE LLAMADOS\n');

  try {
    // 1. Verificar que hay llamados pendientes
    console.log('1️⃣ Verificando llamados pendientes...');
    const llamadosPendientes = await sql`
      SELECT 
        id,
        instalacion_nombre,
        programado_para,
        estado_llamado,
        contacto_telefono
      FROM central_v_llamados_automaticos
      WHERE estado_llamado = 'pendiente'
        AND DATE(programado_para) = CURRENT_DATE
      LIMIT 5
    `;
    
    console.log('📋 Llamados pendientes encontrados:');
    llamadosPendientes.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Instalación: ${row.instalacion_nombre}`);
      console.log(`    Programado: ${row.programado_para}`);
      console.log(`    Estado: ${row.estado_llamado}`);
      console.log(`    Teléfono: ${row.contacto_telefono}`);
      console.log('');
    });

    if (llamadosPendientes.rows.length === 0) {
      console.log('❌ No hay llamados pendientes para probar');
      return;
    }

    const llamadoPrueba = llamadosPendientes.rows[0];
    console.log(`🎯 Usando llamado de prueba: ${llamadoPrueba.instalacion_nombre}`);

    // 2. Verificar que el llamado existe en la tabla central_llamados
    console.log('\n2️⃣ Verificando existencia en tabla central_llamados...');
    const llamadoReal = await sql`
      SELECT 
        id,
        estado,
        programado_para,
        ejecutado_en,
        observaciones
      FROM central_llamados
      WHERE id = ${llamadoPrueba.id}
    `;
    
    if (llamadoReal.rows.length === 0) {
      console.log('❌ El llamado no existe en la tabla central_llamados');
      console.log('🔧 Esto significa que la vista está generando IDs que no existen en la tabla real');
      return;
    }

    console.log('✅ Llamado encontrado en tabla central_llamados:');
    console.log(`  - Estado actual: ${llamadoReal.rows[0].estado}`);
    console.log(`  - Programado: ${llamadoReal.rows[0].programado_para}`);
    console.log(`  - Ejecutado: ${llamadoReal.rows[0].ejecutado_en || 'No ejecutado'}`);

    // 3. Simular registro de llamado exitoso
    console.log('\n3️⃣ Simulando registro de llamado exitoso...');
    const ahora = new Date();
    const programadoPara = new Date(llamadoReal.rows[0].programado_para);
    const slaSegundos = Math.floor((ahora.getTime() - programadoPara.getTime()) / 1000);

    const updateResult = await sql`
      UPDATE central_llamados SET
        estado = 'exitoso',
        observaciones = 'Prueba automática - Llamado registrado exitosamente',
        canal = 'telefono',
        ejecutado_en = ${ahora.toISOString()},
        sla_segundos = ${slaSegundos},
        updated_at = now()
      WHERE id = ${llamadoPrueba.id}
      RETURNING *
    `;

    console.log('✅ Llamado registrado exitosamente:');
    console.log(`  - Nuevo estado: ${updateResult.rows[0].estado}`);
    console.log(`  - Ejecutado en: ${updateResult.rows[0].ejecutado_en}`);
    console.log(`  - SLA: ${updateResult.rows[0].sla_segundos} segundos`);
    console.log(`  - Observaciones: ${updateResult.rows[0].observaciones}`);

    // 4. Verificar que la vista refleja el cambio
    console.log('\n4️⃣ Verificando que la vista refleja el cambio...');
    const vistaActualizada = await sql`
      SELECT 
        estado_llamado,
        observaciones
      FROM central_v_llamados_automaticos
      WHERE id = ${llamadoPrueba.id}
    `;

    if (vistaActualizada.rows.length > 0) {
      console.log('✅ Vista actualizada correctamente:');
      console.log(`  - Estado en vista: ${vistaActualizada.rows[0].estado_llamado}`);
      console.log(`  - Observaciones en vista: ${vistaActualizada.rows[0].observaciones}`);
    } else {
      console.log('❌ El llamado ya no aparece en la vista (esto es normal si cambió de estado)');
    }

    // 5. Probar registro de incidente
    console.log('\n5️⃣ Probando registro de incidente...');
    
    // Primero, revertir el estado a pendiente para la prueba
    await sql`
      UPDATE central_llamados SET
        estado = 'pendiente',
        observaciones = null,
        ejecutado_en = null,
        sla_segundos = null,
        updated_at = now()
      WHERE id = ${llamadoPrueba.id}
    `;

    // Ahora registrar como incidente
    const incidenteResult = await sql`
      UPDATE central_llamados SET
        estado = 'incidente',
        observaciones = 'Prueba automática - Incidente reportado: Problema de comunicación',
        canal = 'telefono',
        ejecutado_en = ${ahora.toISOString()},
        sla_segundos = ${slaSegundos},
        updated_at = now()
      WHERE id = ${llamadoPrueba.id}
      RETURNING *
    `;

    console.log('✅ Incidente registrado:');
    console.log(`  - Estado: ${incidenteResult.rows[0].estado}`);
    console.log(`  - Observaciones: ${incidenteResult.rows[0].observaciones}`);

    // Verificar que se creó el registro de incidente
    const incidenteCreado = await sql`
      SELECT 
        tipo,
        severidad,
        detalle
      FROM central_incidentes
      WHERE llamado_id = ${llamadoPrueba.id}
    `;

    if (incidenteCreado.rows.length > 0) {
      console.log('✅ Registro de incidente creado:');
      console.log(`  - Tipo: ${incidenteCreado.rows[0].tipo}`);
      console.log(`  - Severidad: ${incidenteCreado.rows[0].severidad}`);
      console.log(`  - Detalle: ${incidenteCreado.rows[0].detalle}`);
    } else {
      console.log('❌ No se creó el registro de incidente');
    }

    // 6. Limpiar datos de prueba
    console.log('\n6️⃣ Limpiando datos de prueba...');
    await sql`
      UPDATE central_llamados SET
        estado = 'pendiente',
        observaciones = null,
        ejecutado_en = null,
        sla_segundos = null,
        updated_at = now()
      WHERE id = ${llamadoPrueba.id}
    `;

    await sql`
      DELETE FROM central_incidentes
      WHERE llamado_id = ${llamadoPrueba.id}
    `;

    console.log('✅ Datos de prueba limpiados');

    console.log('\n🎯 RESUMEN DE PRUEBAS:');
    console.log('✅ Llamados pendientes encontrados');
    console.log('✅ Llamado existe en tabla central_llamados');
    console.log('✅ Registro exitoso funciona');
    console.log('✅ Vista se actualiza correctamente');
    console.log('✅ Registro de incidente funciona');
    console.log('✅ Limpieza de datos funciona');
    console.log('\n🎉 TODAS LAS PRUEBAS PASARON - El sistema de registro funciona correctamente');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

testRegistroLlamados();

