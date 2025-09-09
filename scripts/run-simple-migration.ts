import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function runSimpleMigration() {
  console.log('🚀 Ejecutando migración simplificada para nuevos campos de guardias...\n');

  try {
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync(path.join(__dirname, 'migrate-guardias-simple.sql'), 'utf8');
    
    // Dividir en comandos individuales (separados por ;)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Ejecutando ${commands.length} comandos SQL...\n`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`⚡ Ejecutando comando ${i + 1}/${commands.length}...`);
          console.log(`   SQL: ${command.substring(0, 100)}...`);
          await query(command);
          console.log(`✅ Comando ${i + 1} ejecutado exitosamente\n`);
        } catch (error: any) {
          console.log(`⚠️ Comando ${i + 1} falló: ${error.message}\n`);
        }
      }
    }

    // Verificar que los campos se crearon correctamente
    console.log('🔍 Verificando campos creados...');
    const verification = await query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
        AND column_name IN ('monto_anticipo', 'pin', 'dias_vacaciones_pendientes', 'fecha_ingreso', 'fecha_finiquito')
      ORDER BY column_name
    `);

    console.log('📋 Campos verificados:');
    if (verification.rows.length === 0) {
      console.log('   ❌ No se encontraron los nuevos campos');
    } else {
      verification.rows.forEach((row: any) => {
        console.log(`   • ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'} ${row.column_default ? `DEFAULT: ${row.column_default}` : ''}`);
      });
    }

    console.log('\n✅ Migración completada!');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runSimpleMigration();
