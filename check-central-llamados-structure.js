require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkCentralLlamadosStructure() {
  try {
    console.log('🔍 Verificando estructura de central_llamados...\n');

    // 1. Verificar estructura actual
    console.log('1. Estructura actual de la tabla:');
    const structure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'central_llamados'
      ORDER BY ordinal_position;
    `;
    
    console.log('   Columnas encontradas:');
    structure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
    });

    // 2. Verificar si existen campos de auditoría
    console.log('\n2. Verificando campos de auditoría:');
    const auditFields = ['registrado_por_usuario_id', 'registrado_por_usuario_email', 'registrado_en'];
    
    for (const field of auditFields) {
      const exists = structure.rows.some(col => col.column_name === field);
      console.log(`   - ${field}: ${exists ? '✅ Existe' : '❌ No existe'}`);
    }

    // 3. Mostrar algunos registros de ejemplo
    console.log('\n3. Registros de ejemplo:');
    const sample = await sql`
      SELECT id, estado, observaciones, ejecutado_en, created_at, updated_at
      FROM central_llamados 
      LIMIT 3;
    `;
    
    sample.rows.forEach((row, index) => {
      console.log(`   Registro ${index + 1}:`);
      console.log(`     - ID: ${row.id}`);
      console.log(`     - Estado: ${row.estado}`);
      console.log(`     - Ejecutado en: ${row.ejecutado_en}`);
      console.log(`     - Creado: ${row.created_at}`);
      console.log(`     - Actualizado: ${row.updated_at}`);
    });

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCentralLlamadosStructure();
