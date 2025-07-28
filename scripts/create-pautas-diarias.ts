#!/usr/bin/env ts-node

import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { runDatabaseMigrations, createPautasDiariasTable } from '../src/lib/database-migrations';
import { checkConnection } from '../src/lib/database';

async function createPautasDiariasScript() {
  console.log('🚀 Iniciando creación de tabla pautas_diarias...\n');
  
  try {
    // 1. Verificar conexión
    console.log('🔍 Verificando conexión a la base de datos...');
    const connected = await checkConnection();
    if (!connected) {
      console.error('❌ Error: No se pudo conectar a la base de datos');
      console.error('   Verifica que DATABASE_URL esté configurado correctamente');
      process.exit(1);
    }
    console.log('✅ Conexión establecida\n');

    // 2. Ejecutar migración completa (asegura que todas las tablas dependientes existan)
    console.log('🔧 Ejecutando migraciones previas necesarias...');
    const migrationResult = await runDatabaseMigrations();
    
    if (!migrationResult.success) {
      console.error('❌ Error en migraciones previas:');
      migrationResult.errors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }
    
    console.log('✅ Migraciones previas completadas\n');

    // 3. Crear tabla pautas_diarias específicamente
    console.log('📋 Creando tabla pautas_diarias...');
    const pautasDiariasResult = await createPautasDiariasTable();
    
    if (pautasDiariasResult.success) {
      console.log('\n🎉 ¡ÉXITO!');
      console.log('✅ Tabla pautas_diarias creada con éxito. Asistencia diaria lista para gestión operativa y pagos.');
      
      if (pautasDiariasResult.warnings.length > 0) {
        console.log('\n⚠️ Advertencias:');
        pautasDiariasResult.warnings.forEach(warning => console.log(`   ${warning}`));
      }
    } else {
      console.error('\n❌ Error creando tabla pautas_diarias:');
      pautasDiariasResult.errors.forEach(error => console.error(`   ${error}`));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error inesperado:', error);
    process.exit(1);
  }
}

// Ejecutar el script
createPautasDiariasScript(); 