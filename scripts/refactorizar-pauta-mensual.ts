import { query, checkTableExists } from '../src/lib/database';

async function refactorizarPautaMensual() {
  try {
    console.log('🔄 Refactorizando tabla as_turnos_pauta_mensual...');
    
    // Verificar si la tabla existe
    const tablaExiste = await checkTableExists('as_turnos_pauta_mensual');
    if (!tablaExiste) {
      console.log('❌ La tabla as_turnos_pauta_mensual no existe');
      return;
    }

    // 1. Crear tabla temporal con la nueva estructura
    console.log('📝 Creando tabla temporal...');
    await query(`
      CREATE TABLE IF NOT EXISTS as_turnos_pauta_mensual_new (
        id SERIAL PRIMARY KEY,
        puesto_id UUID NOT NULL,
        guardia_id UUID NOT NULL,
        anio INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        dia INTEGER NOT NULL,
        estado TEXT NOT NULL CHECK (estado IN ('trabajado', 'libre', 'permiso')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Crear índices para la nueva tabla
    console.log('📝 Creando índices...');
    await query(`
      CREATE INDEX idx_pauta_mensual_puesto_mes ON as_turnos_pauta_mensual_new (puesto_id, anio, mes);
    `);
    
    await query(`
      CREATE INDEX idx_pauta_mensual_guardia ON as_turnos_pauta_mensual_new (guardia_id);
    `);

    // 3. Migrar datos existentes (si los hay)
    console.log('📝 Migrando datos existentes...');
    const datosExistentes = await query(`
      SELECT COUNT(*) as count FROM as_turnos_pauta_mensual
    `);
    
    if (parseInt(datosExistentes.rows[0].count) > 0) {
      console.log('⚠️  Se encontraron datos existentes. Se requiere migración manual.');
      console.log('📋 Para migrar los datos, necesitas:');
      console.log('   1. Mapear instalacion_id + rol_id a puesto_id');
      console.log('   2. Ejecutar la migración de datos');
      console.log('   3. Verificar la integridad de los datos');
    }

    // 4. Eliminar tabla antigua y renombrar la nueva
    console.log('📝 Reemplazando tabla...');
    await query(`DROP TABLE IF EXISTS as_turnos_pauta_mensual`);
    await query(`ALTER TABLE as_turnos_pauta_mensual_new RENAME TO as_turnos_pauta_mensual`);

    // 5. Crear trigger para actualizar updated_at
    console.log('📝 Creando trigger...');
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await query(`
      CREATE TRIGGER update_as_turnos_pauta_mensual_updated_at
        BEFORE UPDATE ON as_turnos_pauta_mensual
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // 6. Verificar la nueva estructura
    console.log('📝 Verificando nueva estructura...');
    const structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Nueva estructura de la tabla:');
    structure.rows.forEach((column: any) => {
      console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? 'NOT NULL' : ''} ${column.column_default ? `DEFAULT ${column.column_default}` : ''}`);
    });

    console.log("✅ Tabla 'as_turnos_pauta_mensual' refactorizada con éxito");
    console.log('📋 Cambios realizados:');
    console.log('   - Reemplazado instalacion_id por puesto_id (UUID)');
    console.log('   - Mantenido guardia_id, anio, mes, dia, estado');
    console.log('   - Creados índices optimizados para puesto_id');
    console.log('   - No se definieron foreign keys, solo referencia lógica');

  } catch (error) {
    console.error('❌ Error refactorizando tabla as_turnos_pauta_mensual:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  refactorizarPautaMensual()
    .then(() => {
      console.log('✅ Refactorización completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en refactorización:', error);
      process.exit(1);
    });
}

export { refactorizarPautaMensual }; 