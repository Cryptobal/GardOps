#!/usr/bin/env ts-node

import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { runDatabaseMigrations } from '../src/lib/database-migrations';

async function main() {
  console.log('🎯 Script CLI: Iniciando migraciones de base de datos...\n');
  
  try {
    const result = await runDatabaseMigrations();
    
    if (result.success) {
      console.log('\n🎉 Script CLI: ¡Migraciones completadas exitosamente!');
      process.exit(0);
    } else {
      console.log('\n❌ Script CLI: Las migraciones fallaron');
      console.log('Errores:');
      result.errors.forEach(error => console.log(`  - ${error}`));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Script CLI: Error crítico:', error);
    process.exit(1);
  }
}

main(); 