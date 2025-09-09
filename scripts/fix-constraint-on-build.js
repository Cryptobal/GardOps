const { Pool } = require('pg');

// Este script se ejecuta en el build de Vercel para asegurar que el constraint esté correcto
async function fixConstraint() {
  console.log('🔧 Verificando constraint de documentos en producción...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Verificar el constraint actual
    const checkResult = await pool.query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as definition,
        confrelid::regclass as referenced_table
      FROM pg_constraint 
      WHERE conrelid = 'documentos'::regclass 
        AND conname = 'documentos_tipo_documento_id_fkey'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('⚠️ No existe el constraint, creándolo...');
      
      await pool.query(`
        ALTER TABLE documentos 
        ADD CONSTRAINT documentos_tipo_documento_id_fkey 
        FOREIGN KEY (tipo_documento_id) 
        REFERENCES documentos_tipos(id)
      `);
      
      console.log('✅ Constraint creado correctamente');
      return;
    }
    
    const currentTable = checkResult.rows[0].referenced_table;
    console.log('📋 Constraint actual apunta a:', currentTable);
    
    if (currentTable === 'tipos_documentos_postulacion') {
      console.log('❌ Constraint apunta a tabla incorrecta, arreglando...');
      
      // Eliminar el constraint incorrecto
      await pool.query(`
        ALTER TABLE documentos 
        DROP CONSTRAINT documentos_tipo_documento_id_fkey
      `);
      
      console.log('✅ Constraint incorrecto eliminado');
      
      // Crear el constraint correcto
      await pool.query(`
        ALTER TABLE documentos 
        ADD CONSTRAINT documentos_tipo_documento_id_fkey 
        FOREIGN KEY (tipo_documento_id) 
        REFERENCES documentos_tipos(id)
      `);
      
      console.log('✅ Constraint correcto creado');
      
    } else if (currentTable === 'documentos_tipos') {
      console.log('✅ Constraint ya apunta a la tabla correcta');
    }
    
  } catch (error) {
    console.error('❌ Error verificando constraint:', error.message);
    // No fallar el build por esto
  } finally {
    await pool.end();
  }
}

// Ejecutar solo si estamos en Vercel
if (process.env.VERCEL) {
  fixConstraint().then(() => {
    console.log('✅ Verificación de constraint completada');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Error en script de constraint:', err);
    // No fallar el build
    process.exit(0);
  });
} else {
  console.log('⏭️ Saltando verificación de constraint (no estamos en Vercel)');
  process.exit(0);
}
