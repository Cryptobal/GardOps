import { query } from '../src/lib/database';

async function verificarTablasTurnosExtras() {
  try {
    console.log('🔍 Verificando tablas relacionadas con turnos extras...');

    // Verificar todas las tablas que contengan "turno" en el nombre
    const { rows: tables } = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%turno%' 
      AND table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tablas encontradas:');
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });

    // Verificar específicamente las tablas que nos interesan
    const tablasInteresantes = [
      'turnos_extras',
      'TE_turnos_extras',
      'pagos_turnos_extras',
      'planillas_turnos_extras',
      'te_turnos_extras'
    ];

    for (const tabla of tablasInteresantes) {
      const { rows: exists } = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tabla]);

      if (exists[0].exists) {
        console.log(`✅ Tabla ${tabla} existe`);
        
        // Mostrar estructura de la tabla
        const { rows: columns } = await query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tabla]);

        console.log(`📋 Estructura de ${tabla}:`);
        columns.forEach((col: any) => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // Contar registros
        const { rows: count } = await query(`SELECT COUNT(*) as total FROM ${tabla}`);
        console.log(`📊 Total registros en ${tabla}: ${count[0].total}`);
      } else {
        console.log(`❌ Tabla ${tabla} NO existe`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarTablasTurnosExtras()
    .then(() => {
      console.log('✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { verificarTablasTurnosExtras };
