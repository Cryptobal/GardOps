import { query, closePool } from '../src/lib/database';

async function agregarPlanillaIdTurnosExtras() {
  try {
    console.log('🚀 Agregando columna planilla_id a turnos_extras...');

    // Verificar si la columna ya existe
    const { rows: columns } = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras' AND column_name = 'planilla_id'
    `);

    if (columns.length > 0) {
      console.log('✅ La columna planilla_id ya existe');
      return;
    }

    // Agregar la columna planilla_id sin referencia por ahora
    console.log('📝 Agregando columna planilla_id...');
    await query(`
      ALTER TABLE turnos_extras 
      ADD COLUMN planilla_id INTEGER
    `);

    // Crear índice para la nueva columna
    console.log('📊 Creando índice para planilla_id...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_turnos_extras_planilla_id 
      ON turnos_extras(planilla_id)
    `);

    console.log('✅ Columna planilla_id agregada exitosamente');
    console.log('✅ Índice creado para optimizar consultas');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

agregarPlanillaIdTurnosExtras(); 