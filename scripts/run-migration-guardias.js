const { config } = require('dotenv');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

const { query } = require('../src/lib/database.ts');

async function runMigration() {
  console.log('🚀 Ejecutando migración para nuevos campos de guardias...\n');

  try {
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync(path.join(__dirname, 'migrate-guardias-new-fields.sql'), 'utf8');
    
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
          await query(command);
          console.log(`✅ Comando ${i + 1} ejecutado exitosamente\n`);
        } catch (error) {
          console.log(`⚠️ Comando ${i + 1} falló (puede ser normal si ya existe): ${error.message}\n`);
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
    verification.rows.forEach(row => {
      console.log(`   • ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'} ${row.column_default ? `DEFAULT: ${row.column_default}` : ''}`);
    });

    console.log('\n✅ Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
