import { Client } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function fixTurnosExtrasColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a la base de datos');

    // Verificar si la columna updated_at existe en turnos_extras
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras' 
      AND column_name = 'updated_at'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('📝 Agregando columna updated_at a turnos_extras...');
      
      await client.query(`
        ALTER TABLE turnos_extras 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      
      console.log('✅ Columna updated_at agregada exitosamente');
    } else {
      console.log('✅ La columna updated_at ya existe en turnos_extras');
    }

    // Verificar la estructura actual de la tabla
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'turnos_extras'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estructura actual de turnos_extras:');
    structure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

fixTurnosExtrasColumn(); 