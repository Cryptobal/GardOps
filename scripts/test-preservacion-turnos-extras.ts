import { query } from '../src/lib/database';
import { getTenantId } from '@/lib/utils/tenant-utils';

async function testPreservacionTurnosExtras() {
  try {
    console.log('🧪 Probando funcionalidades de preservación de turnos extras...');

    // 1. Verificar estructura actual
    console.log('\n📋 Verificando estructura actual...');
    const { rows: columns } = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'te_turnos_extras' 
      AND column_name IN ('preservado', 'turno_original_id', 'desacoplado_en')
      ORDER BY ordinal_position
    `);

    console.log('Campos de preservación:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // 2. Verificar datos actuales
    console.log('\n📊 Verificando datos actuales...');
    const { rows: turnosActuales } = await query(`
      SELECT id, guardia_id, fecha, estado, valor, pagado, preservado, turno_original_id, desacoplado_en
      FROM te_turnos_extras
      ORDER BY fecha DESC, created_at DESC
    `);

    console.log(`Total de turnos extras: ${turnosActuales.length}`);
    turnosActuales.forEach((turno: any, index: number) => {
      console.log(`  ${index + 1}. ID: ${turno.id}, Fecha: ${turno.fecha}, Estado: ${turno.estado}, Valor: $${turno.valor}, Pagado: ${turno.pagado}, Preservado: ${turno.preservado}`);
    });

    // 3. Verificar índice único
    console.log('\n📊 Verificando índice único...');
    const { rows: indexes } = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'te_turnos_extras' 
      AND indexname = 'idx_guardia_fecha_turno'
    `);

    if (indexes.length > 0) {
      console.log('✅ Índice único creado correctamente');
      console.log(`  - Nombre: ${indexes[0].indexname}`);
      console.log(`  - Definición: ${indexes[0].indexdef}`);
    } else {
      console.log('❌ Índice único no encontrado');
    }

    // 4. Probar validación de duplicados
    console.log('\n🧪 Probando validación de duplicados...');
    
    // Intentar insertar un turno extra para un guardia que ya tiene uno en la misma fecha
    if (turnosActuales.length > 0) {
      const turnoExistente = turnosActuales[0];
      console.log(`  Intentando insertar turno extra para guardia ${turnoExistente.guardia_id} en fecha ${turnoExistente.fecha}...`);
      
      try {
        await query(`
          INSERT INTO te_turnos_extras 
          (guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          turnoExistente.guardia_id,
          turnoExistente.instalacion_id,
          turnoExistente.puesto_id,
          turnoExistente.pauta_id,
          turnoExistente.fecha,
          'reemplazo',
          turnoExistente.valor,
          await getTenantId(request)
        ]);
        
        console.log('❌ Error: Se permitió insertar un duplicado');
      } catch (error: any) {
        if (error.code === '23505') {
          console.log('✅ Validación funcionando: Se impidió insertar duplicado');
        } else {
          console.log(`❌ Error inesperado: ${error.message}`);
        }
      }
    }

    // 5. Probar preservación
    console.log('\n🧪 Probando preservación...');
    if (turnosActuales.length > 0) {
      const turnoParaPreservar = turnosActuales.find((t: any) => !t.preservado);
      
      if (turnoParaPreservar) {
        console.log(`  Preservando turno ID: ${turnoParaPreservar.id}...`);
        
        await query(`
          UPDATE te_turnos_extras 
          SET preservado = true,
              pagado = true,
              fecha_pago = CURRENT_DATE,
              usuario_pago = 'test@example.com',
              desacoplado_en = NOW()
          WHERE id = $1
        `, [turnoParaPreservar.id]);
        
        console.log('✅ Turno preservado correctamente');
        
        // Verificar el cambio
        const { rows: turnoActualizado } = await query(`
          SELECT preservado, pagado, fecha_pago, usuario_pago, desacoplado_en
          FROM te_turnos_extras
          WHERE id = $1
        `, [turnoParaPreservar.id]);
        
        if (turnoActualizado.length > 0) {
          const turno = turnoActualizado[0];
          console.log(`  - Preservado: ${turno.preservado}`);
          console.log(`  - Pagado: ${turno.pagado}`);
          console.log(`  - Fecha pago: ${turno.fecha_pago}`);
          console.log(`  - Usuario pago: ${turno.usuario_pago}`);
          console.log(`  - Desacoplado en: ${turno.desacoplado_en}`);
        }
      } else {
        console.log('ℹ️ No hay turnos no preservados para probar');
      }
    }

    console.log('\n✅ Pruebas completadas');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPreservacionTurnosExtras()
    .then(() => {
      console.log('✅ Pruebas completadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { testPreservacionTurnosExtras };
