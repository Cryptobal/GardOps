import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verificarConstraintsSexo() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 VERIFICANDO CONSTRAINTS DE SEXO');
    console.log('====================================\n');

    // 1. Verificar el constraint específico
    console.log('1️⃣ Verificando constraint guardias_sexo_check...');
    const constraintInfo = await client.query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'guardias_sexo_check';
    `);
    
    if (constraintInfo.rows.length > 0) {
      console.log('✅ Constraint encontrado:');
      console.log('   Nombre:', constraintInfo.rows[0].conname);
      console.log('   Definición:', constraintInfo.rows[0].definition);
    } else {
      console.log('❌ No se encontró el constraint guardias_sexo_check');
    }
    console.log('');

    // 2. Verificar valores actuales en la columna sexo
    console.log('2️⃣ Valores actuales en la columna sexo...');
    const valoresActuales = await client.query(`
      SELECT DISTINCT sexo, COUNT(*) as cantidad
      FROM guardias 
      WHERE sexo IS NOT NULL
      GROUP BY sexo
      ORDER BY sexo;
    `);
    
    console.log('Valores encontrados en la columna sexo:');
    valoresActuales.rows.forEach(row => {
      console.log(`   - "${row.sexo}": ${row.cantidad} registros`);
    });
    console.log('');

    // 3. Verificar si hay otros constraints relacionados
    console.log('3️⃣ Verificando otros constraints en la tabla guardias...');
    const todosConstraints = await client.query(`
      SELECT 
        conname,
        contype,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'guardias'::regclass
      ORDER BY conname;
    `);
    
    console.log('Todos los constraints en guardias:');
    todosConstraints.rows.forEach(constraint => {
      console.log(`   - ${constraint.conname} (${constraint.contype}): ${constraint.definition}`);
    });
    console.log('');

    // 4. Intentar insertar con diferentes valores para probar
    console.log('4️⃣ Probando diferentes valores para sexo...');
    const valoresParaProbar = ['Hombre', 'Mujer', 'Masculino', 'Femenino', 'H', 'M'];
    
    for (const valor of valoresParaProbar) {
      try {
        const testInsert = await client.query(`
          INSERT INTO guardias (rut, nombre, email, tenant_id, activo, sexo, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id, sexo;
        `, [`TEST-${Date.now()}`, 'Test User', 'test@test.com', '00000000-0000-0000-0000-000000000000', true, valor]);
        
        console.log(`✅ "${valor}" - INSERT exitoso, ID: ${testInsert.rows[0].id}`);
        
        // Limpiar
        await client.query('DELETE FROM guardias WHERE id = $1', [testInsert.rows[0].id]);
        console.log(`   🧹 Registro eliminado`);
        
      } catch (error: any) {
        console.log(`❌ "${valor}" - Error: ${error.message}`);
        if (error.constraint) {
          console.log(`   Constraint que falló: ${error.constraint}`);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error durante la verificación:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarConstraintsSexo().catch(console.error);
