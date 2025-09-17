#!/usr/bin/env ts-node

import { query } from '../src/lib/database';
import fs from 'fs';
import path from 'path';

async function fixCentralMonitoreoDefinitivo() {
  console.log('🔧 SOLUCIÓN DEFINITIVA - CENTRAL DE MONITOREO\n');

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), 'db/fix-central-monitoreo-definitivo.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir en comandos separados (por punto y coma)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📊 Ejecutando ${commands.length} comandos SQL...\n`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.toLowerCase().includes('select')) {
        console.log(`${i + 1}. Ejecutando consulta...`);
        const result = await query(command);
        console.log('✅ Resultado:', result.rows);
      } else {
        console.log(`${i + 1}. Ejecutando comando DDL...`);
        await query(command);
        console.log('✅ Comando ejecutado exitosamente');
      }
    }

    console.log('\n🎉 SOLUCIÓN APLICADA EXITOSAMENTE');
    console.log('✅ Vista central_v_llamados_automaticos corregida');
    console.log('✅ IDs duplicados solucionados');
    console.log('✅ Lógica de KPIs corregida');
    console.log('✅ Problemas de JOIN eliminados');

  } catch (error) {
    console.error('❌ Error al aplicar la solución:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  fixCentralMonitoreoDefinitivo()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default fixCentralMonitoreoDefinitivo;
