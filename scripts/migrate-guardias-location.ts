#!/usr/bin/env ts-node

import { config } from 'dotenv';
import path from 'path';
import { query } from '../src/lib/database';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function migrateGuardiasLocation() {
  console.log('🔧 Migrando campos de ubicación geográfica para guardias...');
  
  try {
    // 1. Verificar si la tabla guardias existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'guardias'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla guardias no existe. Ejecuta primero la migración de guardias.');
      return;
    }

    // 2. Añadir columnas de ubicación geográfica
    console.log('📝 Agregando columnas de ubicación geográfica...');
    await query(`
      ALTER TABLE guardias 
      ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8) NULL,
      ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8) NULL,
      ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS comuna VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS region VARCHAR(100) NULL;
    `);

    // 3. Crear índices para búsquedas geográficas
    console.log('🔍 Creando índices para búsquedas geográficas...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_guardias_location ON guardias(latitud, longitud);
      CREATE INDEX IF NOT EXISTS idx_guardias_ciudad ON guardias(ciudad);
      CREATE INDEX IF NOT EXISTS idx_guardias_comuna ON guardias(comuna);
    `);

    // 4. Verificar la migración
    console.log('✅ Verificando migración...');
    const columnsResult = await query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name IN ('latitud', 'longitud', 'ciudad', 'comuna', 'region')
      ORDER BY column_name;
    `);

    console.log('📋 Columnas agregadas:');
    columnsResult.rows.forEach((row: any) => {
      console.log(`   • ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    console.log('🎉 Migración de ubicación geográfica completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateGuardiasLocation();
    process.exit(0);
  } catch (error) {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  }
}

main(); 