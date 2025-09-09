#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function agregarColumnaInstalacionId(): Promise<void> {
  console.log('🚀 Agregando columna instalacion_id a la tabla guardias...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    // 1. Agregar la columna instalacion_id
    console.log('📝 Agregando columna instalacion_id...');
    await pool.query(`
      ALTER TABLE guardias 
      ADD COLUMN IF NOT EXISTS instalacion_id UUID
    `);
    
    // 2. Crear índice para mejorar el rendimiento de consultas
    console.log('🔍 Creando índice...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_guardias_instalacion_id 
      ON guardias(instalacion_id)
    `);
    
    // 3. Verificar que la columna se agregó correctamente
    console.log('✅ Verificando que la columna se agregó...');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'guardias' AND column_name = 'instalacion_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Columna instalacion_id agregada correctamente');
      console.log('📊 Detalles de la columna:', columnCheck.rows[0]);
    } else {
      console.log('❌ Error: La columna no se agregó correctamente');
    }
    
    // 4. Mostrar estadísticas de la tabla
    console.log('📈 Estadísticas de la tabla guardias:');
    const stats = await pool.query(`
      SELECT 
          COUNT(*) as total_guardias,
          COUNT(instalacion_id) as guardias_con_instalacion,
          COUNT(*) - COUNT(instalacion_id) as guardias_sin_instalacion
      FROM guardias
    `);
    
    console.log('📊 Resultados:', stats.rows[0]);
    
    console.log('\n🎉 ¡Columna instalacion_id agregada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la ejecución:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  agregarColumnaInstalacionId()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { agregarColumnaInstalacionId }; 