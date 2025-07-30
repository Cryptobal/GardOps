#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function verificarEstructuraTabla(): Promise<void> {
  console.log('🔍 Verificando estructura de la tabla guardias...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    // Verificar estructura de la columna sexo
    console.log('\n📋 Estructura de la columna sexo:');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'guardias' AND column_name = 'sexo'
    `);
    console.log(result.rows);
    
    // Verificar restricciones CHECK
    console.log('\n🔒 Restricciones CHECK de la tabla guardias:');
    const checkResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition 
      FROM pg_constraint 
      WHERE conrelid = 'guardias'::regclass AND contype = 'c'
    `);
    console.log(checkResult.rows);
    
    // Verificar valores únicos en la columna sexo
    console.log('\n📊 Valores únicos en la columna sexo:');
    const uniqueResult = await pool.query(`
      SELECT DISTINCT sexo, COUNT(*) as cantidad
      FROM guardias 
      WHERE sexo IS NOT NULL 
      GROUP BY sexo
    `);
    console.log(uniqueResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verificarEstructuraTabla(); 