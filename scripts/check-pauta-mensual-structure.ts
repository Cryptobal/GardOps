import { Client } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function checkPautaMensualStructure() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a la base de datos');

    // Verificar la estructura de as_turnos_pauta_mensual
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estructura de as_turnos_pauta_mensual:');
    structure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

    // Verificar restricciones
    const constraints = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'as_turnos_pauta_mensual'
    `);

    console.log('\n🔒 Restricciones de as_turnos_pauta_mensual:');
    constraints.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_type} ${row.column_name ? `(${row.column_name})` : ''} ${row.check_clause ? `CHECK: ${row.check_clause}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

checkPautaMensualStructure(); 