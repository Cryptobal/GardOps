import { query } from '../src/lib/database';

async function migrarDatosPautaMensual() {
  try {
    console.log('🔄 Migrando datos de pauta mensual al nuevo esquema...');
    
    // Verificar si hay datos para migrar
    const datosExistentes = await query(`
      SELECT COUNT(*) as count FROM as_turnos_pauta_mensual
    `);
    
    if (parseInt(datosExistentes.rows[0].count) === 0) {
      console.log('✅ No hay datos para migrar en as_turnos_pauta_mensual');
      return;
    }

    console.log('📝 Iniciando migración de datos...');
    
    // 1. Obtener datos existentes con información de puestos
    const datosParaMigrar = await query(`
      SELECT 
        pm.id,
        pm.instalacion_id,
        pm.guardia_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        po.id as puesto_id
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN as_turnos_puestos_operativos po 
        ON pm.instalacion_id = po.instalacion_id::text
        AND po.guardia_id = pm.guardia_id::uuid
      WHERE po.id IS NOT NULL
    `);

    if (datosParaMigrar.rows.length === 0) {
      console.log('⚠️  No se encontraron puestos operativos correspondientes para los datos existentes');
      console.log('📋 Esto puede indicar que:');
      console.log('   - Los datos son de una versión anterior del sistema');
      console.log('   - Los puestos operativos no están creados');
      console.log('   - Hay inconsistencias en los datos');
      return;
    }

    console.log(`📊 Encontrados ${datosParaMigrar.rows.length} registros para migrar`);

    // 2. Insertar datos en la nueva estructura
    let migrados = 0;
    for (const row of datosParaMigrar.rows) {
      try {
        await query(`
          INSERT INTO as_turnos_pauta_mensual (puesto_id, guardia_id, anio, mes, dia, estado)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (puesto_id, guardia_id, anio, mes, dia) DO NOTHING
        `, [
          row.puesto_id,
          row.guardia_id,
          row.anio,
          row.mes,
          row.dia,
          row.estado
        ]);
        migrados++;
      } catch (error) {
        console.error(`❌ Error migrando registro ${row.id}:`, error);
      }
    }

    console.log(`✅ Migrados ${migrados} registros exitosamente`);

    // 3. Verificar la migración
    const totalNuevos = await query(`
      SELECT COUNT(*) as count FROM as_turnos_pauta_mensual
    `);
    
    console.log(`📊 Total de registros en la nueva tabla: ${totalNuevos.rows[0].count}`);

    // 4. Mostrar estadísticas de la migración
    const estadisticas = await query(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual
      GROUP BY estado
      ORDER BY cantidad DESC
    `);

    console.log('📋 Estadísticas de la migración:');
    estadisticas.rows.forEach((stat: any) => {
      console.log(`   - ${stat.estado}: ${stat.cantidad} registros`);
    });

    console.log('✅ Migración de datos completada exitosamente');

  } catch (error) {
    console.error('❌ Error migrando datos de pauta mensual:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrarDatosPautaMensual()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}

export { migrarDatosPautaMensual }; 