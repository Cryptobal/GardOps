import { query } from '../src/lib/database';

async function verificarColumnaRol() {
  try {
    console.log('🔍 Verificando estructura actual de as_turnos_puestos_operativos...\n');

    // 1. Verificar qué columnas existen
    const columnas = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_puestos_operativos' 
      AND column_name IN ('rol_id', 'rol_servicio_id')
      ORDER BY column_name
    `);

    console.log('📋 Columnas encontradas:');
    columnas.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // 2. Verificar índices
    const indices = await query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'as_turnos_puestos_operativos' 
      AND (indexdef LIKE '%rol_id%' OR indexdef LIKE '%rol_servicio_id%')
    `);

    console.log('\n📋 Índices encontrados:');
    indices.rows.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
    });

    // 3. Verificar foreign keys
    const fks = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'as_turnos_puestos_operativos'::regclass 
      AND contype = 'f'
      AND (pg_get_constraintdef(oid) LIKE '%rol_id%' OR pg_get_constraintdef(oid) LIKE '%rol_servicio_id%')
    `);

    console.log('\n📋 Foreign Keys encontradas:');
    fks.rows.forEach((fk: any) => {
      console.log(`  - ${fk.conname}: ${fk.definition}`);
    });

    // 4. Verificar datos de muestra
    const muestra = await query(`
      SELECT id, rol_id, rol_servicio_id, nombre_puesto
      FROM as_turnos_puestos_operativos 
      LIMIT 3
    `).catch(() => ({ rows: [] }));

    console.log('\n📋 Muestra de datos:');
    muestra.rows.forEach((row: any) => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    rol_id: ${row.rol_id || 'NULL'}`);
      console.log(`    rol_servicio_id: ${row.rol_servicio_id || 'NULL'}`);
      console.log(`    nombre_puesto: ${row.nombre_puesto}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

verificarColumnaRol();
