import { query } from '../src/lib/database';

async function migrateTurnosExtrasPreservacion() {
  try {
    console.log('🔄 Iniciando migración para preservación de turnos extras...');

    // 1. Agregar campos para preservación
    console.log('📋 Agregando campos de preservación...');
    
    // Verificar si los campos ya existen
    const { rows: columns } = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'te_turnos_extras' 
      AND column_name IN ('preservado', 'turno_original_id', 'desacoplado_en')
    `);
    
    const existingColumns = columns.map((col: any) => col.column_name);
    
    if (!existingColumns.includes('preservado')) {
      await query(`
        ALTER TABLE te_turnos_extras 
        ADD COLUMN preservado BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Campo preservado agregado');
    }
    
    if (!existingColumns.includes('turno_original_id')) {
      await query(`
        ALTER TABLE te_turnos_extras 
        ADD COLUMN turno_original_id UUID
      `);
      console.log('✅ Campo turno_original_id agregado');
    }
    
    if (!existingColumns.includes('desacoplado_en')) {
      await query(`
        ALTER TABLE te_turnos_extras 
        ADD COLUMN desacoplado_en TIMESTAMP WITH TIME ZONE
      `);
      console.log('✅ Campo desacoplado_en agregado');
    }

    // 2. Crear índice único para prevenir doble asignación
    console.log('📊 Creando índice único para prevenir doble asignación...');
    
    // Verificar si el índice ya existe
    const { rows: indexes } = await query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'te_turnos_extras' 
      AND indexname = 'idx_guardia_fecha_turno'
    `);
    
    if (indexes.length === 0) {
      await query(`
        CREATE UNIQUE INDEX idx_guardia_fecha_turno 
        ON te_turnos_extras (guardia_id, fecha)
      `);
      console.log('✅ Índice único creado para prevenir doble asignación');
    } else {
      console.log('ℹ️ Índice único ya existe');
    }

    // 3. Agregar comentarios para documentación
    console.log('📝 Agregando comentarios...');
    await query(`
      COMMENT ON COLUMN te_turnos_extras.preservado IS 'Indica si el turno extra debe preservarse aunque se elimine el turno original';
    `);
    await query(`
      COMMENT ON COLUMN te_turnos_extras.turno_original_id IS 'ID del turno original que generó este turno extra';
    `);
    await query(`
      COMMENT ON COLUMN te_turnos_extras.desacoplado_en IS 'Timestamp cuando el turno extra fue desacoplado del turno original';
    `);

    console.log('✅ Migración completada exitosamente');
    
    // 4. Mostrar resumen de la estructura actual
    console.log('\n📋 Estructura actual de la tabla te_turnos_extras:');
    const { rows: allColumns } = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'te_turnos_extras' 
      ORDER BY ordinal_position
    `);
    
    allColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  }
}

// Ejecutar la migración si se llama directamente
if (require.main === module) {
  migrateTurnosExtrasPreservacion()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { migrateTurnosExtrasPreservacion };
