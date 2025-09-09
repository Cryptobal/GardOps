#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';
import * as fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function analizarRutsFaltantes() {
  console.log('🔍 Analizando RUTs en Neon vs CSV...\n');

  try {
    // 1. Obtener todos los RUTs de Neon
    const neonResult = await query(`
      SELECT rut FROM guardias 
      ORDER BY rut
    `);
    
    const rutsEnNeon = new Set(neonResult.rows.map((row: any) => row.rut));
    console.log(`📊 RUTs en Neon: ${rutsEnNeon.size}`);

    // 2. Leer el archivo CSV manualmente
    const csvContent = fs.readFileSync('BBDD GGSS.csv', 'utf-8');
    const lines = csvContent.split('\n');
    
    // Saltar la primera línea (headers)
    const dataLines = lines.slice(1);
    
    const rutsEnCSV = new Set<string>();
    const guardiasCSV: any[] = [];

    dataLines.forEach((line, index) => {
      if (line.trim()) {
        // Dividir por punto y coma, pero manejar las comillas
        const columns = line.split(';');
        if (columns.length >= 3) {
          const rut = columns[2]?.trim();
          if (rut && rut !== 'RUT' && rut !== '') {
            rutsEnCSV.add(rut);
            guardiasCSV.push({
              rut,
              apellido_paterno: columns[3] || '',
              apellido_materno: columns[4] || '',
              nombre: columns[5] || '',
              email: columns[6] || '',
              telefono: columns[7] || '',
              sexo: columns[8] || '',
              activo: columns[9] === 'TRUE',
              fecha_contrato: columns[10] || '',
              instalacion: columns[11] || '',
              jornada: columns[12] || '',
              banco: columns[13] || '',
              tipo_cuenta: columns[14] || '',
              numero_cuenta: columns[15] || '',
              anticipo: columns[16] || '',
              fecha_nacimiento: columns[17] || '',
              direccion: columns[18] || '',
              comuna: columns[19] || '',
              ciudad: columns[20] || '',
              nacionalidad: columns[21] || '',
              fecha_os10: columns[22] || ''
            });
          }
        }
      }
    });

    console.log(`📊 RUTs en CSV: ${rutsEnCSV.size}`);
    console.log(`📊 Total de guardias en CSV: ${guardiasCSV.length}\n`);

    // 3. Encontrar RUTs que faltan en Neon
    const rutsFaltantes = new Set<string>();
    rutsEnCSV.forEach((rut: string) => {
      if (!rutsEnNeon.has(rut)) {
        rutsFaltantes.add(rut);
      }
    });

    console.log(`❌ RUTs faltantes en Neon: ${rutsFaltantes.size}`);
    
    if (rutsFaltantes.size > 0) {
      console.log('\n📋 Lista de RUTs faltantes:');
      const rutsFaltantesArray = Array.from(rutsFaltantes).sort();
      rutsFaltantesArray.forEach((rut, index) => {
        const guardia = guardiasCSV.find(g => g.rut === rut);
        if (guardia) {
          console.log(`${index + 1}. ${rut} - ${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`);
        }
      });

      // 4. Filtrar guardias que faltan
      const guardiasFaltantes = guardiasCSV.filter(g => rutsFaltantes.has(g.rut));
      
      console.log(`\n✅ Guardias a cargar: ${guardiasFaltantes.length}`);
      
      // Guardar en archivo para referencia
      fs.writeFileSync(
        'scripts/guardias-faltantes.json', 
        JSON.stringify(guardiasFaltantes, null, 2)
      );
      
      console.log('\n💾 Guardias faltantes guardados en: scripts/guardias-faltantes.json');
      
      return guardiasFaltantes;
    } else {
      console.log('✅ Todos los RUTs del CSV ya están en Neon');
      return [];
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Ejecutar el análisis
analizarRutsFaltantes()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el análisis:', error);
    process.exit(1);
  }); 