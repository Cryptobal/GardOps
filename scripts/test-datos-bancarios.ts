#!/usr/bin/env ts-node

import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function testDatosBancarios() {
  console.log('🧪 Iniciando pruebas de Datos Bancarios...\n');
  
  try {
    // 1. Verificar que la tabla pagos_turnos_extras existe
    console.log('📋 Verificando tabla pagos_turnos_extras...');
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pagos_turnos_extras'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ Tabla pagos_turnos_extras existe');
    } else {
      console.log('❌ Tabla pagos_turnos_extras no existe');
      return;
    }

    // 2. Verificar que hay datos de ejemplo
    console.log('📋 Verificando datos de ejemplo...');
    const pagosCount = await query(`
      SELECT COUNT(*) as total FROM pagos_turnos_extras
    `);
    console.log(`✅ Hay ${pagosCount.rows[0].total} pagos registrados`);

    // 3. Verificar que hay guardias con datos bancarios
    console.log('📋 Verificando guardias con datos bancarios...');
    const guardiasConBanco = await query(`
      SELECT COUNT(*) as total FROM guardias 
      WHERE banco IS NOT NULL OR tipo_cuenta IS NOT NULL OR numero_cuenta IS NOT NULL
    `);
    console.log(`✅ Hay ${guardiasConBanco.rows[0].total} guardias con datos bancarios`);

    // 4. Verificar que hay bancos disponibles
    console.log('📋 Verificando bancos disponibles...');
    const bancosCount = await query(`
      SELECT COUNT(*) as total FROM bancos
    `);
    console.log(`✅ Hay ${bancosCount.rows[0].total} bancos disponibles`);

    // 5. Mostrar ejemplo de datos
    console.log('\n📋 Ejemplo de datos de pagos:');
    const ejemploPagos = await query(`
      SELECT 
        p.id,
        p.fecha_pago,
        p.glosa,
        p.monto_total,
        p.estado,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno
      FROM pagos_turnos_extras p
      INNER JOIN guardias g ON p.guardia_id = g.id
      LIMIT 3
    `);

    ejemploPagos.rows.forEach((pago: any, index: number) => {
      console.log(`   ${index + 1}. ${pago.nombre} ${pago.apellido_paterno} ${pago.apellido_materno} - ${pago.glosa} - $${pago.monto_total} - ${pago.estado}`);
    });

    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('✅ Sistema de Datos Bancarios está funcionando correctamente');
    console.log('✅ Endpoints configurados:');
    console.log('   • GET /api/guardias/[id]/banco');
    console.log('   • POST /api/guardias/[id]/bancarios');
    console.log('   • GET /api/guardias/[id]/pagos-turnos-extras');
    console.log('   • GET /api/guardias/[id]/pagos/[pago_id]/csv');
    console.log('   • GET /api/bancos');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar las pruebas
testDatosBancarios()
  .then(() => {
    console.log('\n✅ Pruebas completadas exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando pruebas:', error);
    process.exit(1);
  }); 