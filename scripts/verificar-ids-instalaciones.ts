import { query } from '../src/lib/database';

async function verificarIdsInstalaciones() {
  console.log('🔍 Verificando estado de IDs de instalaciones...\n');
  
  try {
    // 1. Contar total de instalaciones
    const totalResult = await query('SELECT COUNT(*) as total FROM instalaciones');
    const total = totalResult.rows[0].total;
    console.log(`📊 Total de instalaciones: ${total}`);

    // 2. Contar instalaciones con IDs numéricos
    const numericasResult = await query(`
      SELECT COUNT(*) as count 
      FROM instalaciones 
      WHERE id ~ '^[0-9]+$'
    `);
    const numericas = numericasResult.rows[0].count;
    console.log(`🔢 Instalaciones con IDs numéricos: ${numericas}`);

    // 3. Contar instalaciones con UUIDs válidos
    const uuidResult = await query(`
      SELECT COUNT(*) as count 
      FROM instalaciones 
      WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);
    const uuid = uuidResult.rows[0].count;
    console.log(`🔑 Instalaciones con UUIDs válidos: ${uuid}`);

    // 4. Contar instalaciones con otros formatos
    const otrosResult = await query(`
      SELECT COUNT(*) as count 
      FROM instalaciones 
      WHERE id !~ '^[0-9]+$' 
      AND id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);
    const otros = otrosResult.rows[0].count;
    console.log(`❓ Instalaciones con otros formatos: ${otros}`);

    // 5. Mostrar ejemplos de cada tipo
    console.log('\n📋 Ejemplos de instalaciones:');

    // IDs numéricos
    if (numericas > 0) {
      const ejemplosNumericos = await query(`
        SELECT id, nombre, estado 
        FROM instalaciones 
        WHERE id ~ '^[0-9]+$'
        ORDER BY CAST(id AS INTEGER)
        LIMIT 5
      `);
      console.log('\n🔢 IDs numéricos:');
      ejemplosNumericos.rows.forEach(row => {
        console.log(`   - ID: ${row.id} | Nombre: ${row.nombre} | Estado: ${row.estado}`);
      });
    }

    // UUIDs válidos
    if (uuid > 0) {
      const ejemplosUUID = await query(`
        SELECT id, nombre, estado 
        FROM instalaciones 
        WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ORDER BY created_at DESC
        LIMIT 5
      `);
      console.log('\n🔑 UUIDs válidos:');
      ejemplosUUID.rows.forEach(row => {
        console.log(`   - ID: ${row.id} | Nombre: ${row.nombre} | Estado: ${row.estado}`);
      });
    }

    // Otros formatos
    if (otros > 0) {
      const ejemplosOtros = await query(`
        SELECT id, nombre, estado 
        FROM instalaciones 
        WHERE id !~ '^[0-9]+$' 
        AND id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ORDER BY created_at DESC
        LIMIT 5
      `);
      console.log('\n❓ Otros formatos:');
      ejemplosOtros.rows.forEach(row => {
        console.log(`   - ID: ${row.id} | Nombre: ${row.nombre} | Estado: ${row.estado}`);
      });
    }

    // 6. Verificar integridad referencial
    console.log('\n🔗 Verificando integridad referencial...');
    
    // Verificar turnos configurados
    const turnosResult = await query(`
      SELECT COUNT(*) as count 
      FROM as_turnos_configuracion tc
      LEFT JOIN instalaciones i ON tc.instalacion_id = i.id
      WHERE i.id IS NULL
    `);
    const turnosHuérfanos = turnosResult.rows[0].count;
    console.log(`   • Turnos configurados sin instalación: ${turnosHuérfanos}`);

    // Verificar requisitos
    const requisitosResult = await query(`
      SELECT COUNT(*) as count 
      FROM as_turnos_requisitos tr
      LEFT JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE i.id IS NULL
    `);
    const requisitosHuérfanos = requisitosResult.rows[0].count;
    console.log(`   • Requisitos sin instalación: ${requisitosHuérfanos}`);

    // Verificar logs
    const logsResult = await query(`
      SELECT COUNT(*) as count 
      FROM logs_instalaciones l
      LEFT JOIN instalaciones i ON l.instalacion_id = i.id
      WHERE i.id IS NULL
    `);
    const logsHuérfanos = logsResult.rows[0].count;
    console.log(`   • Logs sin instalación: ${logsHuérfanos}`);

    // Verificar documentos
    const docsResult = await query(`
      SELECT COUNT(*) as count 
      FROM documentos_instalaciones d
      LEFT JOIN instalaciones i ON d.instalacion_id = i.id
      WHERE i.id IS NULL
    `);
    const docsHuérfanos = docsResult.rows[0].count;
    console.log(`   • Documentos sin instalación: ${docsHuérfanos}`);

    // Verificar pautas
    const pautasResult = await query(`
      SELECT COUNT(*) as count 
      FROM pautas_mensuales p
      LEFT JOIN instalaciones i ON p.instalacion_id = i.id
      WHERE i.id IS NULL
    `);
    const pautasHuérfanas = pautasResult.rows[0].count;
    console.log(`   • Pautas sin instalación: ${pautasHuérfanas}`);

    // 7. Resumen y recomendaciones
    console.log('\n📊 RESUMEN:');
    console.log(`   • Total instalaciones: ${total}`);
    console.log(`   • Con IDs numéricos: ${numericas}`);
    console.log(`   • Con UUIDs válidos: ${uuid}`);
    console.log(`   • Con otros formatos: ${otros}`);
    
    const totalHuérfanos = turnosHuérfanos + requisitosHuérfanos + logsHuérfanos + docsHuérfanos + pautasHuérfanas;
    console.log(`   • Registros huérfanos: ${totalHuérfanos}`);

    console.log('\n💡 RECOMENDACIONES:');
    
    if (numericas > 0) {
      console.log('   ⚠️  Se encontraron instalaciones con IDs numéricos.');
      console.log('   🔧 Ejecuta: npm run migrate:ids-numericos');
    } else {
      console.log('   ✅ No se encontraron instalaciones con IDs numéricos.');
    }

    if (otros > 0) {
      console.log('   ⚠️  Se encontraron instalaciones con formatos de ID no estándar.');
      console.log('   🔍 Revisa manualmente estos casos.');
    }

    if (totalHuérfanos > 0) {
      console.log('   ⚠️  Se encontraron registros huérfanos (sin instalación padre).');
      console.log('   🧹 Considera limpiar estos registros.');
    }

    if (numericas === 0 && otros === 0 && totalHuérfanos === 0) {
      console.log('   ✅ La base de datos está en buen estado.');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

// Ejecutar verificación
if (require.main === module) {
  verificarIdsInstalaciones()
    .then(() => {
      console.log('\n🎉 Verificación completada.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en la verificación:', error);
      process.exit(1);
    });
}

export { verificarIdsInstalaciones }; 