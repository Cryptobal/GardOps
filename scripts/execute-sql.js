// Script para ejecutar SQL
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

async function executeSQL() {
  console.log('🔍 Ejecutando SQL...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('scripts/create-logs-instalaciones.sql', 'utf8');
    
    // Dividir en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Ejecutando ${commands.length} comandos SQL...\n`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`Comando ${i + 1}: ${command.substring(0, 50)}...`);
          const result = await pool.query(command);
          console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
          if (result.rows && result.rows.length > 0) {
            console.log('Resultado:', result.rows);
          }
        } catch (error) {
          console.error(`❌ Error en comando ${i + 1}:`, error.message);
        }
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

executeSQL(); 