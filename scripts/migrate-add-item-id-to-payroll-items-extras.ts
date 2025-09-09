import { query } from '../src/lib/database';

async function migrateAddItemIdToPayrollItemsExtras() {
  try {
    console.log('🚀 Iniciando migración: Agregar item_id a payroll_items_extras...');

    // Verificar si la columna item_id ya existe
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payroll_items_extras' 
      AND column_name = 'item_id'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ La columna item_id ya existe en payroll_items_extras');
      return;
    }

    // Agregar la columna item_id
    console.log('📝 Agregando columna item_id...');
    await query(`
      ALTER TABLE payroll_items_extras 
      ADD COLUMN item_id UUID REFERENCES sueldo_item(id)
    `);

    // Crear índice para la nueva columna
    console.log('📊 Creando índice para item_id...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_item 
      ON payroll_items_extras(item_id)
    `);

    // Agregar comentario a la columna
    console.log('📝 Agregando comentario a la columna...');
    await query(`
      COMMENT ON COLUMN payroll_items_extras.item_id IS 'Referencia al catálogo de ítems de sueldo'
    `);

    console.log('✅ Migración completada exitosamente');
    console.log('📋 Resumen de cambios:');
    console.log('   - Agregada columna item_id (UUID, nullable)');
    console.log('   - Creado índice idx_payroll_items_extras_item');
    console.log('   - Agregado comentario descriptivo');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar la migración si se llama directamente
if (require.main === module) {
  migrateAddItemIdToPayrollItemsExtras()
    .then(() => {
      console.log('🎉 Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error);
      process.exit(1);
    });
}

export default migrateAddItemIdToPayrollItemsExtras;
