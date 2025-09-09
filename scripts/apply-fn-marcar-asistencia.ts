import { query } from '@/lib/database';
import fs from 'fs';
import path from 'path';

async function applyFnMarcarAsistencia() {
  console.log('🔧 Aplicando función fn_marcar_asistencia...\n');
  
  try {
    // Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), 'db', 'create-fn-marcar-asistencia.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 Ejecutando SQL desde:', sqlPath);
    
    // Ejecutar el SQL
    await query(sql);
    
    console.log('✅ Función fn_marcar_asistencia creada correctamente');
    
    // Verificar que la función existe
    const checkResult = await query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'as_turnos'
        AND p.proname = 'fn_marcar_asistencia'
      ) as exists
    `);
    
    if (checkResult.rows[0]?.exists) {
      console.log('✅ Verificación: La función existe en el esquema as_turnos');
    } else {
      console.error('⚠️ Advertencia: La función no se encontró después de crearla');
    }
    
    // Test básico de la función (sin ejecutar cambios reales)
    console.log('\n📋 Información de la función:');
    const infoResult = await query(`
      SELECT 
        p.proname as nombre,
        pg_catalog.pg_get_function_arguments(p.oid) as argumentos,
        pg_catalog.pg_get_function_result(p.oid) as retorno
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'as_turnos'
      AND p.proname = 'fn_marcar_asistencia'
    `);
    
    if (infoResult.rows.length > 0) {
      const info = infoResult.rows[0];
      console.log('  Nombre:', info.nombre);
      console.log('  Argumentos:', info.argumentos);
      console.log('  Retorno:', info.retorno);
    }
    
  } catch (error) {
    console.error('❌ Error aplicando función:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  applyFnMarcarAsistencia()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default applyFnMarcarAsistencia;
