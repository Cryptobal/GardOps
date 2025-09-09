import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function fixPPCConstraint() {
  console.log('🔧 Corrigiendo constraint de asignación única...\n');

  try {
    // 1. Eliminar constraint e índices existentes
    console.log('📋 Eliminando constraint e índices existentes...');
    
    await query(`
      ALTER TABLE as_turnos_asignaciones DROP CONSTRAINT IF EXISTS unique_active_assignment
    `);
    
    await query(`
      DROP INDEX IF EXISTS unique_active_assignment
    `);
    
    console.log('✅ Constraint e índices eliminados');

    // 1.5. Limpiar datos duplicados
    console.log('📋 Limpiando datos duplicados...');
    
    await query(`
      DELETE FROM asignaciones_guardias 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM asignaciones_guardias 
        WHERE estado = 'Activa' AND fecha_termino IS NULL
        GROUP BY guardia_id
      )
      AND estado = 'Activa' AND fecha_termino IS NULL
    `);
    
    console.log('✅ Datos duplicados limpiados');

    // 2. Crear índice único correcto
    console.log('📋 Creando índice único correcto...');
    
    await query(`
      CREATE UNIQUE INDEX unique_active_assignment 
      ON asignaciones_guardias (guardia_id) 
      WHERE estado = 'Activa' AND fecha_termino IS NULL
    `);
    
    console.log('✅ Índice único creado correctamente');

    // 3. Verificar índice
    console.log('📋 Verificando índice único...');
    
    const index = await query(`
      SELECT 
        indexname as index_name,
        indexdef as index_definition
      FROM pg_indexes 
      WHERE indexname = 'unique_active_assignment'
    `);
    
    if (index.rows.length > 0) {
      console.log('Índice único encontrado:');
      console.log(`  - Nombre: ${index.rows[0].index_name}`);
      console.log(`  - Definición: ${index.rows[0].index_definition}`);
    } else {
      console.log('❌ Índice único no encontrado');
    }

    // 4. Probar constraint
    console.log('📋 Probando constraint...');
    
    // Obtener un guardia con asignación activa
    const guardiaConAsignacion = await query(`
      SELECT guardia_id 
      FROM asignaciones_guardias 
      WHERE estado = 'Activa' AND fecha_termino IS NULL 
      LIMIT 1
    `);
    
    if (guardiaConAsignacion.rows.length > 0) {
      const guardiaId = guardiaConAsignacion.rows[0].guardia_id;
      
      try {
        // Intentar crear asignación duplicada
        await query(`
          INSERT INTO asignaciones_guardias (
            guardia_id, 
            requisito_puesto_id, 
            tipo_asignacion,
            fecha_inicio,
            estado
          ) VALUES ($1, 1, 'PPC', CURRENT_DATE, 'Activa')
        `, [guardiaId]);
        
        console.log('❌ Error: Se permitió crear asignación duplicada');
      } catch (error: any) {
        if (error.code === '23505') {
          console.log('✅ Índice único funciona correctamente: No se permite asignación duplicada');
        } else {
          console.log('⚠️ Error inesperado:', error.message);
        }
      }
    } else {
      console.log('⚠️ No hay guardias con asignación activa para probar');
    }

    console.log('\n✅ Índice único corregido exitosamente');

  } catch (error) {
    console.error('❌ Error corrigiendo índice único:', error);
    throw error;
  }
}

// Ejecutar corrección
fixPPCConstraint()
  .then(() => {
    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 