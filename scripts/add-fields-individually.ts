import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function addFieldsIndividually() {
  console.log('🚀 Agregando campos individualmente a la tabla guardias...\n');

  const commands = [
    {
      name: 'monto_anticipo',
      sql: 'ALTER TABLE guardias ADD COLUMN IF NOT EXISTS monto_anticipo INTEGER CHECK (monto_anticipo >= 0 AND monto_anticipo <= 999999)'
    },
    {
      name: 'pin',
      sql: 'ALTER TABLE guardias ADD COLUMN IF NOT EXISTS pin VARCHAR(4) UNIQUE CHECK (pin ~ \'^[0-9]{4}$\')'
    },
    {
      name: 'dias_vacaciones_pendientes',
      sql: 'ALTER TABLE guardias ADD COLUMN IF NOT EXISTS dias_vacaciones_pendientes DECIMAL(5,2) DEFAULT 0.00 CHECK (dias_vacaciones_pendientes >= 0)'
    },
    {
      name: 'fecha_ingreso',
      sql: 'ALTER TABLE guardias ADD COLUMN IF NOT EXISTS fecha_ingreso DATE'
    },
    {
      name: 'fecha_finiquito',
      sql: 'ALTER TABLE guardias ADD COLUMN IF NOT EXISTS fecha_finiquito DATE'
    }
  ];

  try {
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      try {
        console.log(`⚡ Agregando campo: ${cmd.name}...`);
        await query(cmd.sql);
        console.log(`✅ Campo ${cmd.name} agregado exitosamente\n`);
      } catch (error: any) {
        console.log(`⚠️ Error agregando ${cmd.name}: ${error.message}\n`);
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

    console.log('\n✅ Proceso completado!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addFieldsIndividually();
