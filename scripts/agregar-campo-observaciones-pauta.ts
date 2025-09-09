import { query, checkTableExists } from '../src/lib/database';

async function agregarCampoObservaciones() {
  try {
    console.log('🔄 Agregando campo observaciones a as_turnos_pauta_mensual...');
    
    // Verificar si la tabla existe
    const tablaExiste = await checkTableExists('as_turnos_pauta_mensual');
    if (!tablaExiste) {
      console.log('❌ La tabla as_turnos_pauta_mensual no existe');
      return;
    }

    // Verificar si la columna ya existe
    const columnExists = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual' 
      AND column_name = 'observaciones'
    `);

    if (columnExists.rows.length > 0) {
      console.log('✅ La columna observaciones ya existe');
      return;
    }

    // Agregar la columna observaciones
    console.log('📝 Agregando columna observaciones...');
    await query(`
      ALTER TABLE as_turnos_pauta_mensual 
      ADD COLUMN observaciones TEXT
    `);

    console.log('✅ Campo observaciones agregado exitosamente');

    // Verificar la estructura final
    const structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estructura actualizada de la tabla:');
    structure.rows.forEach((column: any) => {
      console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? 'NOT NULL' : ''} ${column.column_default ? `DEFAULT ${column.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error agregando campo observaciones:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  agregarCampoObservaciones()
    .then(() => {
      console.log('✅ Campo observaciones agregado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { agregarCampoObservaciones }; 